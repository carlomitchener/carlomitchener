import { join, resolve } from "node:path";
import { pages } from "./build.ts";
import site from "../site.json";

const org = resolve(import.meta.dir, "..");
const dist = join(org, "dist");
const feed = resolve(org, "../../data/carlomitchener/feed");
const root = (process.env.SITE_URL ?? site.root).replace(/\/$/, "");

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

const server = Bun.serve({
  port: Number(process.env.PORT ?? 3000),
  development: true,
  async fetch(request) {
    let path = decodeURIComponent(new URL(request.url).pathname);
    if (path.startsWith("/cdn/")) {
      const local = Bun.file(join(feed, path.slice("/cdn/feed/".length)));
      if (path.startsWith("/cdn/feed/") && (await local.exists())) return new Response(local);
      return remote(path);
    }
    if (path.endsWith("/")) path += "index.html";
    const file = Bun.file(join(dist, path));
    if (await file.exists()) return new Response(file);
    return new Response(Bun.file(join(dist, "404.html")), { status: 404, headers: { "content-type": "text/html" } });
  },
});

console.log(`dev: ${done.site.routes.length} routes at ${server.url}`);
