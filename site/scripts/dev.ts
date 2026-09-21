import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { disk, main } from "../kit/dev.ts";
import site from "../site.json";
import { DEV, DEV_DIR, PICSUM } from "../src/config/dev.ts";
import { spec } from "./build.ts";

const org = resolve(import.meta.dir, "..");
const feed = resolve(org, "../../data/carlomitchener/feed");
const data = resolve(org, "../../data/carlomitchener/site");
const root = (process.env.SITE_URL ?? site.root).replace(/\/$/, "");
const poolFile = join(data, DEV_DIR, "picsum.json");
const pool: string[] = DEV && existsSync(poolFile) ? JSON.parse(readFileSync(poolFile, "utf8")) : [];

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

async function cdn(path: string): Promise<Response> {
  const local = disk([["/cdn/feed/", feed]], path);
  if (local) return local;
  if (!DEV || !pool.length) return remote(path);
  if (path.endsWith(".mp4")) {
    const glob = new Bun.Glob(path.endsWith("-1080.mp4") ? "p/*/*-1080.mp4" : "p/*/????????.mp4");
    for await (const found of glob.scan(feed)) return new Response(Bun.file(join(feed, found)));
    return new Response("no local post to stand in", { status: 404 });
  }
  if (path.endsWith(".json")) return Response.json({ name: path.split("/").at(-2), steps: [], rate: 30 });
  return picsum(path);
}

/* MAIN */

const MIRRORED = new Set(["/automator/automator.json", "/stats/stats.json"]);

await main(spec, {
  watch: ["../avatar"],
  extra: (_, path) => (path.startsWith("/cdn/") ? cdn(path) : MIRRORED.has(path) ? remote(path) : null),
  line: () => (DEV ? "DEV fixtures" : "live data"),
});
