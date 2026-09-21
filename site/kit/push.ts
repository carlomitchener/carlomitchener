import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { build, digest, globals, today, type Manifest, type Output, type Spec } from "./ssg/build.ts";
import { client, del, getText, need, putBytes } from "./s3.ts";

/* WHERE */

export type Store = { bucket: string; prefix: string };

export type Block = { prefix: string; guard: string[]; bucket: string; store: Store; hashed: string[] };

const ASSET = "@";
const BATCH = 32;

export function block(spec: Spec): Block {
  const config = spec.config ?? (JSON.parse(readFileSync(join(spec.root, "site.json"), "utf8")) as Record<string, unknown>);
  const found = config.push as Block | undefined;
  if (!found) throw new Error("push: site.json has no push block");
  return found;
}

/* HEADERS */

export const IMMUTABLE = "public, max-age=31536000, immutable";
export const REVALIDATE = "public, max-age=0, must-revalidate";

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

export const kind = (path: string) => TYPES[(path.match(/\.([^./]+)$/)?.[1] ?? "").toLowerCase()] ?? "application/octet-stream";

export const cache = (path: string, hashed: RegExp[]) => (hashed.some((re) => re.test(path)) ? IMMUTABLE : REVALIDATE);

export const rules = (hashed: string[]) => hashed.map((one) => new RegExp(one));

/* GUARD */

export const mine = (path: string, guard: string[]) => !guard.some((one) => path.startsWith(one));

type Page = {
  contents?: { key: string }[];
  commonPrefixes?: ({ prefix: string } | string)[];
  isTruncated?: boolean;
  nextContinuationToken?: string | null;
};

export type Lister = { list: (options: { prefix: string; delimiter: string; maxKeys: number; continuationToken?: string }) => Promise<Page | null> };

export async function sweep(s3: Lister, root: string, guard: string[], at = root, out: string[] = []): Promise<string[]> {
  let token: string | undefined;
  do {
    const page = await s3.list({ prefix: at, delimiter: "/", maxKeys: 1000, continuationToken: token });
    for (const item of page?.contents ?? []) out.push(item.key.slice(root.length));
    for (const one of page?.commonPrefixes ?? []) {
      const next = typeof one === "string" ? one : one.prefix;
      if (!guard.some((each) => next === root + each)) await sweep(s3, root, guard, next, out);
    }
    token = page?.isTruncated ? (page.nextContinuationToken ?? undefined) : undefined;
  } while (token);
  return out;
}

/* MANIFEST */

export function assets(items: Output[], old: Manifest): Manifest {
  const out: Manifest = {};
  for (const item of items) {
    const body = typeof item.bytes === "string" ? new TextEncoder().encode(item.bytes) : item.bytes;
    const hash = digest([body]).slice(0, 16);
    const was = old[ASSET + item.path];
    out[ASSET + item.path] = was && was.hash === hash ? was : { hash, at: today(), outputs: [item.path] };
  }
  return out;
}

export function typing(manifest: Manifest): Map<string, string> {
  const out = new Map<string, string>();
  for (const record of Object.values(manifest)) for (const [path, type] of Object.entries(record.types ?? {})) out.set(path, type);
  return out;
}

export function spread(manifest: Manifest): Map<string, string> {
  const out = new Map<string, string>();
  for (const [key, record] of Object.entries(manifest)) for (const path of record.outputs) out.set(path, key);
  return out;
}

/* LOCAL */

export const holding = () => process.env.DRY === "1";

const where = (store: Store) => join(process.env.DRY_DIR ?? join(tmpdir(), "push", store.prefix), "manifest.json");

const held = (path: string) => (existsSync(path) ? readFileSync(path, "utf8") : null);

function hold(path: string, text: string) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, text);
}

/* PUSH */

export async function push(spec: Spec, options: { dry?: boolean } = {}): Promise<{ rendered: number; uploaded: number; deleted: number }> {
  const conf = block(spec);
  const hashed = rules(conf.hashed);
  const local = holding();
  const site = local ? null : client(need(conf.bucket));
  const store = local ? null : conf.store.bucket === conf.bucket ? site : client(need(conf.store.bucket));
  const key = `${conf.store.prefix}/manifest.json`;
  const found = store ? await getText(store, key) : held(where(conf.store));
  const old: Manifest = found ? JSON.parse(found) : {};
  const carry = join(tmpdir(), `push-remote-${process.pid}.json`);
  writeFileSync(carry, JSON.stringify(old, null, 2) + "\n");
  const done = await build(spec, { manifest: carry, verify: false });
  rmSync(carry, { force: true });
  const next: Manifest = { ...done.manifest, ...assets(await globals(done.site, spec), old) };
  const want = spread(next);
  const had = spread(old);
  const types = typing(next);
  const upload: string[] = [];
  for (const [path, name] of want) {
    if (!mine(path, conf.guard)) continue;
    const was = old[name];
    if (was && was.hash === next[name]!.hash && had.has(path)) continue;
    upload.push(path);
  }
  const seen = found || !site ? [...had.keys()] : await sweep(site, conf.prefix, conf.guard);
  const remove = seen.filter((path) => mine(path, conf.guard) && !want.has(path));
  const header = (path: string) => (types.has(path) ? REVALIDATE : cache(path, hashed));
  const text = JSON.stringify(next, null, 2) + "\n";
  if (options.dry) {
    const fixed = upload.filter((path) => header(path) === IMMUTABLE);
    for (const path of fixed) console.log(`immutable ${conf.prefix + path}`);
    console.log(`${upload.length - fixed.length} more at max-age 0, ${remove.length} to delete`);
  } else if (site && store) {
    for (let i = 0; i < upload.length; i += BATCH) {
      await Promise.all(
        upload.slice(i, i + BATCH).map((path) =>
          putBytes(site, conf.prefix + path, new Uint8Array(readFileSync(join(done.site.out, path))), {
            type: types.get(path) ?? kind(path),
            cacheControl: header(path),
          }),
        ),
      );
    }
    if (remove.length) await del(site, remove.map((path) => conf.prefix + path), BATCH);
    await putBytes(store, key, text, { type: "application/json", cacheControl: REVALIDATE });
  } else hold(where(conf.store), text);
  return { rendered: done.rendered, uploaded: upload.length, deleted: remove.length };
}

/* MAIN */

export async function main(spec: Spec): Promise<void> {
  const dry = process.argv.includes("--dry");
  const done = await push(spec, { dry });
  const guard = block(spec).guard.join(", ");
  console.log(
    `push${dry ? " --dry" : ""}${holding() ? " --local" : ""}: ${done.rendered} rendered, ${done.uploaded} uploaded, ${done.deleted} deleted, ${guard} guarded`,
  );
}
