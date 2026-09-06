import { existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { pages } from "./build.ts";

const org = resolve(import.meta.dir, "..");
const dist = join(org, "dist");

const done = await pages();

const server = Bun.serve({
  port: Number(process.env.PORT ?? 3000),
  development: true,
  async fetch(request) {
    let path = decodeURIComponent(new URL(request.url).pathname);
    if (path.endsWith("/")) path += "index.html";
    const file = Bun.file(join(dist, path));
    if (await file.exists()) return new Response(file);
    return new Response(Bun.file(join(dist, "404.html")), { status: 404, headers: { "content-type": "text/html" } });
  },
});

console.log(`dev: ${done.site.routes.length} routes at ${server.url}`);
