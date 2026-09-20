import { existsSync, readFileSync, statSync, watch } from "node:fs";
import { join, relative, resolve } from "node:path";
import site from "../site.json";
import { DEV, DEV_DIR, PICSUM } from "../src/config/dev.ts";

const org = resolve(import.meta.dir, "..");
const dist = join(org, "dist");
const feed = resolve(org, "../../data/carlomitchener/feed");
const data = resolve(org, "../../data/carlomitchener/site");
const root = (process.env.SITE_URL ?? site.root).replace(/\/$/, "");
const poolFile = join(data, DEV_DIR, "picsum.json");
const pool: string[] = DEV && existsSync(poolFile) ? JSON.parse(readFileSync(poolFile, "utf8")) : [];

/* BUILD */

async function build(): Promise<string> {
  const run = Bun.spawn(["bun", join(org, "scripts", "build.ts")], { cwd: org, stdout: "pipe", stderr: "pipe" });
  const [out, err] = await Promise.all([new Response(run.stdout).text(), new Response(run.stderr).text()]);
  if ((await run.exited) !== 0) throw new Error(err.trim() || out.trim() || "build failed");
  return out.trim().split("\n").at(-1) ?? "";
}

/* WATCH */

const WATCHED = ["src", "ui", "pages", "ssg", "scripts", "site.json", "../README.md", "../shop/files", "../avatar"];

const pending = new Set<string>();
let timer: ReturnType<typeof setTimeout> | null = null;

function changed(path: string) {
  if (path.includes("/.") || path.endsWith("~")) return;
  pending.add(path);
  if (timer) clearTimeout(timer);
  timer = setTimeout(rebuild, 80);
}

async function rebuild() {
  const files = [...pending].map((one) => relative(org, one));
  pending.clear();
  const styled = files.every((one) => one.endsWith(".css"));
  try {
    const line = await build();
    console.log(`dev: ${line} (${files.join(", ")})`);
    server.publish("dev", styled ? "css" : "reload");
  } catch (error) {
    const text = error instanceof Error ? error.message : String(error);
    console.error(`dev: build failed\n${text}`);
    server.publish("dev", `error\n${text}`);
  }
}

for (const name of WATCHED) {
  const path = resolve(org, name);
  if (!existsSync(path)) continue;
  const dir = statSync(path).isDirectory();
  watch(path, { recursive: dir }, (_, file) => changed(dir && file ? join(path, String(file)) : path));
}
if (existsSync(data)) watch(data, { recursive: true }, (_, file) => file && String(file).endsWith(".json") && changed(join(data, String(file))));

/* CLIENT */

const SNIPPET = `<script>(function(){var box=null;function show(text){if(!box){box=document.createElement("pre");box.style.cssText="position:fixed;inset:auto 0 0 0;margin:0;padding:1rem;background:#300;color:#fcc;font:12px/1.4 monospace;white-space:pre-wrap;z-index:99999";document.body.appendChild(box)}box.textContent=text}function hide(){if(box){box.remove();box=null}}function swap(){fetch(location.href).then(function(r){return r.text()}).then(function(html){var next=Array.from(html.matchAll(/href="([^"]+\\.css)"/g)).map(function(m){return m[1]});document.querySelectorAll('link[rel="stylesheet"]').forEach(function(link,i){if(next[i]&&link.getAttribute("href")!==next[i])link.href=next[i]})})}function open(lost){var ws=new WebSocket((location.protocol==="https:"?"wss://":"ws://")+location.host+"/__dev");ws.onopen=function(){if(lost)location.reload()};ws.onmessage=function(e){var msg=String(e.data);if(msg==="css"){hide();swap()}else if(msg.indexOf("error")===0)show(msg.slice(6));else location.reload()};ws.onclose=function(){setTimeout(function(){open(true)},500)}}open(false)})()</script>`;

const inject = (html: string) => html.replace("</body>", `${SNIPPET}</body>`);

/* REMOTE */

async function remote(path: string): Promise<Response> {
  const reply = await fetch(root + path);
  const headers = new Headers();
  for (const name of ["content-type", "content-length", "cache-control"]) {
    const value = reply.headers.get(name);
    if (value) headers.set(name, value);
  }
  return new Response(reply.body, { status: reply.status, headers });
}

/* PICSUM */

function picsum(path: string): Response {
  let hash = 0;
  for (const char of path) hash = (hash * 31 + char.charCodeAt(0)) % 2147483647;
  const size = path.endsWith(".webp") ? 540 : 1080;
  return Response.redirect(`${PICSUM}/${pool[hash % pool.length]}/${size}/${size}`, 302);
}

async function fallback(path: string): Promise<Response> {
  if (!DEV || !pool.length) return remote(path);
  if (path.endsWith(".mp4")) {
    const glob = new Bun.Glob(path.endsWith("-1080.mp4") ? "p/*/*-1080.mp4" : "p/*/????????.mp4");
    for await (const found of glob.scan(feed)) return new Response(Bun.file(join(feed, found)));
    return new Response("no local post to stand in", { status: 404 });
  }
  if (path.endsWith(".json")) return Response.json({ name: path.split("/").at(-2), steps: [], rate: 30 });
  return picsum(path);
}

/* SERVE */

const HTML = { "content-type": "text/html; charset=utf-8" };

async function page(path: string, status = 200): Promise<Response> {
  const file = Bun.file(join(dist, path));
  if (!(await file.exists())) return status === 404 ? new Response("not built yet", { status: 503 }) : page("404.html", 404);
  return new Response(inject(await file.text()), { status, headers: HTML });
}

const server = Bun.serve({
  port: Number(process.env.PORT ?? 3000),
  development: true,
  websocket: {
    open(ws) {
      ws.subscribe("dev");
    },
    message() {},
  },
  async fetch(request) {
    let path = decodeURIComponent(new URL(request.url).pathname);
    if (path === "/__dev") return server.upgrade(request) ? undefined : new Response("upgrade failed", { status: 400 });
    if (path.startsWith("/cdn/")) {
      const local = Bun.file(join(feed, path.slice("/cdn/feed/".length)));
      if (path.startsWith("/cdn/feed/") && (await local.exists())) return new Response(local);
      return fallback(path);
    }
    if (path.startsWith("/status/") && path.endsWith(".json")) return remote(path);
    if (path.endsWith("/")) path += "index.html";
    if (path.endsWith(".html")) return page(path);
    const file = Bun.file(join(dist, path));
    if (await file.exists()) return new Response(file);
    return page("404.html", 404);
  },
});

const first = await build().catch((error: Error) => `build failed\n${error.message}`);
console.log(`dev${DEV ? " DEV" : ""}: ${first} at ${server.url}, watching ${WATCHED.join(" ")}`);
