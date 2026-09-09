import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { spec } from "./build.ts";
import { need } from "../lib/env.ts";
import { client, del, getText, putBytes } from "../../aws/s3.ts";
import type { S3Client } from "bun";
import type { Manifest, Output } from "kit/ssg/build.ts";

const { build, digest, globals, today } = await import("kit/ssg/build.ts");

/* WHERE */

const PREFIX = "site/";
const GUARD = ["cdn/", "art/"];
const REMOTE = "data/build/manifest.json";
const ASSET = "@";
const BATCH = 32;
const DRY = process.env.DRY === "1";
const HOLD = join(process.env.DRY_DIR ?? "/tmp/carlomitchener", "manifest.json");

/* HEADERS */

const IMMUTABLE = "public, max-age=31536000, immutable";
const REVALIDATE = "public, max-age=0, must-revalidate";

const HASHED = [/(^|\/)lib-[^/]+\.js$/, /(^|\/)lib-[^/]+\.css$/, /\.wasm$/, /-[0-9a-f]{8}\.[^./]+$/];

const TYPES: Record<string, string> = {
  html: "text/html; charset=utf-8",
  js: "text/javascript; charset=utf-8",
  mjs: "text/javascript; charset=utf-8",
  css: "text/css; charset=utf-8",
  json: "application/json",
  map: "application/json",
  webmanifest: "application/manifest+json",
  xml: "application/xml",
  txt: "text/plain; charset=utf-8",
  md: "text/markdown; charset=utf-8",
  tex: "text/plain; charset=utf-8",
  wasm: "application/wasm",
  svg: "image/svg+xml",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  ico: "image/x-icon",
  pdf: "application/pdf",
  woff2: "font/woff2",
};

const kind = (path: string) => TYPES[(path.match(/\.([^./]+)$/)?.[1] ?? "").toLowerCase()] ?? "application/octet-stream";

const cache = (path: string) => (HASHED.some((re) => re.test(path)) ? IMMUTABLE : REVALIDATE);

/* GUARD */

const mine = (path: string) => !GUARD.some((one) => path.startsWith(one));

async function sweep(s3: S3Client, prefix: string, out: string[]): Promise<string[]> {
  let token: string | undefined;
  do {
    const page = await s3.list({ prefix, delimiter: "/", maxKeys: 1000, continuationToken: token });
    for (const item of page?.contents ?? []) out.push(item.key.slice(PREFIX.length));
    for (const one of page?.commonPrefixes ?? []) {
      const next = typeof one === "string" ? one : one.prefix;
      if (!GUARD.some((one) => next === PREFIX + one)) await sweep(s3, next, out);
    }
    token = page?.isTruncated ? (page.nextContinuationToken ?? undefined) : undefined;
  } while (token);
  return out;
}

/* MANIFEST */

function assets(items: Output[], old: Manifest): Manifest {
  const out: Manifest = {};
  for (const item of items) {
    const body = typeof item.bytes === "string" ? new TextEncoder().encode(item.bytes) : item.bytes;
    const hash = digest([body]).slice(0, 16);
    const was = old[ASSET + item.path];
    out[ASSET + item.path] = was && was.hash === hash ? was : { hash, at: today(), outputs: [item.path] };
  }
  return out;
}

function typing(manifest: Manifest): Map<string, string> {
  const out = new Map<string, string>();
  for (const record of Object.values(manifest)) for (const [path, type] of Object.entries(record.types ?? {})) out.set(path, type);
  return out;
}

function spread(manifest: Manifest): Map<string, string> {
  const out = new Map<string, string>();
  for (const [key, record] of Object.entries(manifest)) for (const path of record.outputs) out.set(path, key);
  return out;
}

/* LOCAL */

const held = () => (existsSync(HOLD) ? readFileSync(HOLD, "utf8") : null);

function hold(text: string) {
  mkdirSync(dirname(HOLD), { recursive: true });
  writeFileSync(HOLD, text);
}

/* PUSH */

export async function push(options: { dry?: boolean } = {}): Promise<{ rendered: number; uploaded: number; deleted: number }> {
  const s3 = DRY ? null : client(need("CARLOMITCHENER_BUCKET"));
  const found = s3 ? await getText(s3, REMOTE) : held();
  const old: Manifest = found ? JSON.parse(found) : {};
  const carry = join(tmpdir(), `carlomitchener-remote-${process.pid}.json`);
  writeFileSync(carry, JSON.stringify(old, null, 2) + "\n");
  const done = await build(spec, { manifest: carry, verify: false });
  rmSync(carry, { force: true });
  const next: Manifest = { ...done.manifest, ...assets(await globals(done.site, spec), old) };
  const want = spread(next);
  const had = spread(old);
  const types = typing(next);
  const upload: string[] = [];
  for (const [path, key] of want) {
    if (!mine(path)) continue;
    const was = old[key];
    if (was && was.hash === next[key]!.hash && had.has(path)) continue;
    upload.push(path);
  }
  const seen = found || !s3 ? [...had.keys()] : await sweep(s3, PREFIX, []);
  const remove = seen.filter((path) => mine(path) && !want.has(path));
  const text = JSON.stringify(next, null, 2) + "\n";
  if (!options.dry) {
    if (s3) {
      for (let i = 0; i < upload.length; i += BATCH) {
        await Promise.all(
          upload.slice(i, i + BATCH).map((path) =>
            putBytes(s3, PREFIX + path, new Uint8Array(readFileSync(join(done.site.out, path))), {
              type: types.get(path) ?? kind(path),
              cacheControl: types.has(path) ? REVALIDATE : cache(path),
            }),
          ),
        );
      }
      if (remove.length) await del(s3, remove.map((path) => PREFIX + path), BATCH);
      await putBytes(s3, REMOTE, text, { type: "application/json", cacheControl: REVALIDATE });
    } else hold(text);
  }
  return { rendered: done.rendered, uploaded: upload.length, deleted: remove.length };
}

/* MAIN */

if (import.meta.main) {
  const dry = process.argv.includes("--dry");
  const done = await push({ dry });
  console.log(`push${dry ? " --dry" : ""}${DRY ? " --local" : ""}: ${done.rendered} rendered, ${done.uploaded} uploaded, ${done.deleted} deleted`);
}
