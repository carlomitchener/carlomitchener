import type { HTMLBundle } from "bun";
import { existsSync, statSync, watch, type FSWatcher } from "node:fs";
import { relative, resolve, sep } from "node:path";
import { escape, forget, scan, type Output, type Site, type Spec } from "./ssg/build.ts";
import { clean, find, lost, reply, type } from "./serve.ts";

/* OPTIONS */

export type Entry = { route: string; file: string };

export type Mount = [string, string];

export type Options = {
  html?: (site: Site) => Entry[];
  scripts?: (site: Site) => Entry[];
  disk?: (site: Site) => Mount[];
  watch?: string[];
  extra?: (site: Site, path: string) => Promise<Response | null> | Response | null;
  line?: (site: Site) => string;
};

/* STATE */

type Held = { runs: number; watchers: FSWatcher[]; timer: ReturnType<typeof setTimeout> | null };

const held = ((globalThis as unknown as { __dev?: Held }).__dev ??= { runs: 0, watchers: [], timer: null });

const HOT = process.execArgv.includes("--hot");

const HTML = { "content-type": "text/html; charset=utf-8" };

/* OVERLAY */

const SNIPPET = `<script>(function(){var box=null;function show(text){if(!box){box=document.createElement("pre");box.style.cssText="position:fixed;inset:auto 0 0 0;margin:0;padding:1rem;background:#300;color:#fcc;font:12px/1.4 monospace;white-space:pre-wrap;z-index:99999";document.body.appendChild(box)}box.textContent=text}function hide(){if(box){box.remove();box=null}}function swap(){fetch(location.href).then(function(r){return r.text()}).then(function(html){var next=Array.from(html.matchAll(/href="([^"]+\\.css)"/g)).map(function(m){return m[1]});document.querySelectorAll('link[rel="stylesheet"]').forEach(function(link,i){if(next[i]&&link.getAttribute("href")!==next[i])link.href=next[i]})})}function open(lost){var ws=new WebSocket((location.protocol==="https:"?"wss://":"ws://")+location.host+"/__dev");ws.onopen=function(){if(lost)location.reload()};ws.onmessage=function(e){var msg=String(e.data);if(msg==="css"){hide();swap()}else if(msg.indexOf("error")===0)show(msg.slice(6));else location.reload()};ws.onclose=function(){setTimeout(function(){open(true)},500)}}open(false)})()</script>`;

const inject = (html: string) => (html.includes("</body>") ? html.replace("</body>", `${SNIPPET}</body>`) : `${html}${SNIPPET}`);

async function dressed(response: Response): Promise<Response> {
  if (!(response.headers.get("content-type") ?? "").startsWith("text/html")) return response;
  return new Response(inject(await response.text()), { status: response.status, headers: HTML });
}

const failed = (error: unknown) => {
  const text = error instanceof Error ? (error.stack ?? error.message) : String(error);
  const body = `<!doctype html><meta charset="utf-8"><title>dev: error</title><pre style="white-space:pre-wrap;padding:1rem;font:13px/1.4 monospace">${escape(text)}</pre>`;
  return new Response(inject(body), { status: 500, headers: HTML });
};

/* DISK */

function within(dir: string, rest: string): string | null {
  const base = resolve(dir);
  const full = resolve(base, `./${rest}`);
  return full === base || full.startsWith(base + sep) ? full : null;
}

export function disk(mounts: Mount[], path: string): Response | null {
  for (const [at, dir] of mounts) {
    if (!dir || !path.startsWith(at)) continue;
    const found = within(dir, path.slice(at.length));
    if (!found || !existsSync(found) || !statSync(found).isFile()) continue;
    return new Response(Bun.file(found), { headers: { "content-type": type(found) } });
  }
  return null;
}

/* WATCH */

function watched(spec: Spec, site: Site, more: string[]): string[] {
  const paths = new Set<string>([import.meta.dir]);
  for (const one of Object.values(site.inputs)) if (!one.missing) paths.add(one.path);
  if (site.kit) paths.add(site.kit.path);
  for (const dir of spec.templates ?? []) paths.add(resolve(site.root, dir));
  for (const one of more) paths.add(resolve(site.root, one));
  return [...paths].filter((path) => existsSync(path));
}

const skipped = (path: string) => path.includes("/.") || path.endsWith("~") || (HOT && path in require.cache);

/* MAIN */

export async function main(spec: Spec, options: Options = {}) {
  for (const one of held.watchers) one.close();
  held.watchers = [];
  if (held.timer) clearTimeout(held.timer);
  held.timer = null;
  held.runs++;
  forget();
  let site = await scan(spec);
  const html = options.html?.(site) ?? [];
  const scripts = options.scripts?.(site) ?? [];
  const mounts = options.disk?.(site) ?? [];
  const built = new Map<string, Output>();
  const owned = (path: string) => html.some((one) => path.startsWith(one.route));
  const routes: Record<string, HTMLBundle> = {};
  for (const one of html) {
    const page = (await import(one.file)).default as HTMLBundle;
    routes[one.route] = page;
    if (one.route.length > 1) routes[one.route.replace(/\/$/, "")] = page;
  }

  async function script(path: string): Promise<Response | null> {
    const kept = built.get(path);
    if (kept) return reply(kept);
    const entry = scripts.find((one) => one.route === path);
    if (!entry || !existsSync(entry.file)) return null;
    const done = await Bun.build({ entrypoints: [entry.file], root: site.root, define: { "process.env.NODE_ENV": '"development"' }, naming: { asset: "[name]-[hash].[ext]" } });
    if (!done.success) throw new Error(`dev: ${relative(site.root, entry.file)} failed to bundle\n${done.logs.join("\n")}`);
    for (const item of done.outputs) {
      const at = item.path.replace(/^\.\//, "");
      built.set(`/${at}`, { path: at, bytes: new Uint8Array(await item.arrayBuffer()) });
    }
    const hit = built.get(path);
    return hit ? reply(hit) : null;
  }

  async function answer(path: string): Promise<Response> {
    if (!clean(path)) return lost(spec, site);
    return (
      (await script(path)) ??
      (await options.extra?.(site, path)) ??
      (owned(path) ? null : await find(spec, site, path)) ??
      disk(mounts, path) ??
      (await lost(spec, site))
    );
  }

  const server = Bun.serve({
    port: Number(process.env.PORT ?? (site.config.dev as { port?: number } | undefined)?.port ?? 3000),
    hostname: "127.0.0.1",
    development: true,
    routes,
    websocket: {
      open(ws) {
        ws.subscribe("dev");
      },
      message() {},
    },
    async fetch(request) {
      const path = decodeURIComponent(new URL(request.url).pathname);
      if (path === "/__dev") return server.upgrade(request) ? undefined : new Response("upgrade failed", { status: 400 });
      try {
        return await dressed(await answer(path));
      } catch (error) {
        console.error(`dev: ${path}\n${error instanceof Error ? (error.stack ?? error.message) : String(error)}`);
        return failed(error);
      }
    },
  });

  const pending = new Set<string>();
  let busy: Promise<void> | null = null;

  async function refresh() {
    held.timer = null;
    if (busy) {
      held.timer = setTimeout(refresh, 80);
      return;
    }
    const files = [...pending].map((one) => relative(site.root, one));
    pending.clear();
    const styled = files.length > 0 && files.every((one) => one.endsWith(".css"));
    busy = (async () => {
      try {
        forget();
        built.clear();
        site = await scan(spec);
        console.log(`dev: ${styled ? "css" : "reload"} (${files.join(", ")})`);
        server.publish("dev", styled ? "css" : "reload");
      } catch (error) {
        const text = error instanceof Error ? error.message : String(error);
        console.error(`dev: scan failed\n${text}`);
        server.publish("dev", `error\n${text}`);
      }
    })();
    await busy;
    busy = null;
  }

  function changed(path: string) {
    if (skipped(path)) return;
    pending.add(path);
    if (held.timer) clearTimeout(held.timer);
    held.timer = setTimeout(refresh, 80);
  }

  for (const path of watched(spec, site, options.watch ?? [])) {
    const dir = statSync(path).isDirectory();
    held.watchers.push(watch(path, { recursive: dir }, (_, file) => changed(dir && file ? resolve(path, String(file)) : path)));
  }

  if (held.runs > 1) server.publish("dev", "reload");
  const note = options.line ? `, ${options.line(site)}` : "";
  const mode = HOT ? "" : " (no --hot: a script edit needs a restart)";
  console.log(`dev${held.runs > 1 ? ` run ${held.runs}` : ""}: ${site.routes.length} routes${note} at ${server.url}${mode}`);
}
