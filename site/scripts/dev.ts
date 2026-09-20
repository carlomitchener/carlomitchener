import { join, resolve } from "node:path";
import { pages } from "./build.ts";
import site from "../site.json";
import { DEV, DEV_DIR, PICSUM } from "../src/config/dev.ts";
import { existsSync, readFileSync } from "node:fs";

const org = resolve(import.meta.dir, "..");
const dist = join(org, "dist");
const feed = resolve(org, "../../data/carlomitchener/feed");
const root = (process.env.SITE_URL ?? site.root).replace(/\/$/, "");
const poolFile = resolve(org, "../../data/carlomitchener/site", DEV_DIR, "picsum.json");
const pool: string[] = DEV && existsSync(poolFile) ? JSON.parse(readFileSync(poolFile, "utf8")) : [];

const done = await pages();

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

const server = Bun.serve({
  port: Number(process.env.PORT ?? 3000),
  development: true,
  async fetch(request) {
    let path = decodeURIComponent(new URL(request.url).pathname);
    if (path.startsWith("/cdn/")) {
      const local = Bun.file(join(feed, path.slice("/cdn/feed/".length)));
      if (path.startsWith("/cdn/feed/") && (await local.exists())) return new Response(local);
      return fallback(path);
    }
    if (path.startsWith("/status/") && path.endsWith(".json")) return remote(path);
    if (path.endsWith("/")) path += "index.html";
    const file = Bun.file(join(dist, path));
    if (await file.exists()) return new Response(file);
    return new Response(Bun.file(join(dist, "404.html")), { status: 404, headers: { "content-type": "text/html" } });
  },
});

console.log(`dev${DEV ? " DEV" : ""}: ${done.site.routes.length} routes at ${server.url}`);
