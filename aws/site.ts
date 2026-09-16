import type { S3Client } from "bun";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, readdirSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { client, getText, putBytes } from "./s3.ts";
import { need } from "../site/src/lib/env.ts";

/* WHERE */

const SOURCE = "carlomitchener/carlomitchener";
const HEAD_KEY = "data/build/head";
const AGENT = "carlomitchener-site";
const SRC_DIR = "/tmp/src/carlomitchener";
const CACHE_DIR = process.env.BUN_INSTALL_CACHE_DIR || "/tmp/bun/cache";
const DRY = process.env.DRY === "1";
const HOLD = process.env.DRY_DIR ?? "/tmp/carlomitchener";
const SRC = process.env.SRC ?? "";

/* CLOCK */

let mark = Date.now();

function log(line: string) {
  const now = Date.now();
  console.log(`${line} ${now - mark}ms`);
  mark = now;
}

/* HEAD */

type Head = { sha: string; etag: string; data: string };

type Source = "push" | "schedule" | "manual";

type Event = { source?: Source; sha?: string; repo?: string };

const short = (sha: string) => sha.slice(0, 7) || "none";

const local = () => join(HOLD, "head");

async function readHead(s3: S3Client | null): Promise<Head> {
  const text = s3 ? await getText(s3, HEAD_KEY) : existsSync(local()) ? readFileSync(local(), "utf8") : null;
  const [sha = "", etag = "", data = ""] = (text ?? "").trim().split("\n");
  return { sha: sha.trim(), etag: etag.trim(), data: data.trim() };
}

async function writeHead(s3: S3Client | null, head: Head): Promise<void> {
  const body = `${head.sha}\n${head.etag}\n${head.data}\n`;
  if (!s3) {
    mkdirSync(HOLD, { recursive: true });
    writeFileSync(local(), body);
    return;
  }
  await putBytes(s3, HEAD_KEY, body, { type: "text/plain", cacheControl: "no-store" });
}

/* GITHUB */

async function commit(etag: string): Promise<{ sha: string; etag: string } | null> {
  const headers: Record<string, string> = { "user-agent": AGENT, accept: "application/vnd.github+json" };
  if (etag) headers["if-none-match"] = etag;
  const res = await fetch(`https://api.github.com/repos/${SOURCE}/commits/main`, { headers });
  if (res.status === 304) return null;
  if (!res.ok) throw new Error(`github ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const body = (await res.json()) as { sha?: string };
  if (!body.sha) throw new Error("github: the commit carries no sha");
  return { sha: body.sha, etag: res.headers.get("etag") ?? "" };
}

async function unpack(slug: string, ref: string, into: string): Promise<void> {
  const stage = `${into}.stage`;
  rmSync(stage, { recursive: true, force: true });
  rmSync(into, { recursive: true, force: true });
  const res = await fetch(`https://codeload.github.com/${slug}/tar.gz/${ref}`, { headers: { "user-agent": AGENT } });
  if (!res.ok) throw new Error(`codeload ${slug} ${ref}: ${res.status}`);
  const files = await new Bun.Archive(new Uint8Array(await res.arrayBuffer())).extract(stage);
  const [top] = readdirSync(stage);
  if (!files || !top) throw new Error(`codeload ${slug} ${ref}: the tarball is empty`);
  renameSync(join(stage, top), into);
  rmSync(stage, { recursive: true, force: true });
}

/* CHILD */

async function run(cmd: string[], cwd: string): Promise<string> {
  const env = { ...(process.env as Record<string, string>), HOME: "/tmp", BUN_INSTALL_CACHE_DIR: CACHE_DIR };
  const child = Bun.spawn(cmd, { cwd, env, stdout: "pipe", stderr: "pipe" });
  const [out, err] = await Promise.all([new Response(child.stdout).text(), new Response(child.stderr).text()]);
  const code = await child.exited;
  if (code !== 0) throw new Error(`${cmd.join(" ")}: exit ${code}\n${(err || out).trim().slice(-1500)}`);
  return out;
}

/* SNAPSHOT */

const SHAPE: Record<string, (body: unknown) => unknown> = {
  "shop.json": (body) => (body as { products?: unknown })?.products ?? [],
  "feed.json": (body) => body ?? [],
};

function dataHash(site: string): string {
  const hash = createHash("sha256");
  for (const [name, take] of Object.entries(SHAPE)) {
    const path = join(site, "..", "..", "data", "carlomitchener", "site", name);
    hash.update(name);
    hash.update(existsSync(path) ? JSON.stringify(take(JSON.parse(readFileSync(path, "utf8")))) : "gone");
  }
  return hash.digest("hex").slice(0, 16);
}

/* BUILD */

async function make(s3: S3Client | null, head: Head, stored: Head): Promise<string> {
  const bun = process.execPath;
  if (SRC) log(`source ${SRC}`);
  else {
    await unpack(SOURCE, head.sha, SRC_DIR);
    log(`source ${short(head.sha)}`);
  }
  const site = join(SRC || SRC_DIR, "site");
  await run([bun, "install", "--frozen-lockfile"], site);
  log("install");
  await run([bun, "run", DRY ? "fake" : "snapshot"], site);
  head.data = dataHash(site);
  log(`snapshot ${head.data || "none"}`);
  if (head.sha === stored.sha && head.data === stored.data) {
    if (head.etag !== stored.etag) await writeHead(s3, head);
    return `unchanged ${short(head.sha)}, data same`;
  }
  const out = await run([bun, "run", "push"], site);
  const line = out.split("\n").map((one) => one.trim()).find((one) => one.startsWith("push")) ?? "push: no count line";
  log(line);
  await writeHead(s3, head);
  log(`head ${short(head.sha)}`);
  return line;
}

/* HANDLER */

async function once(event: Event): Promise<string> {
  const began = Date.now();
  mark = began;
  const s3 = DRY ? null : client(need("CARLOMITCHENER_BUCKET"));
  const stored = await readHead(s3);
  const pinned = event.repo === SOURCE ? (event.sha ?? "") : "";
  const head: Head = { sha: pinned, etag: pinned ? "" : stored.etag, data: stored.data };
  if (!head.sha) {
    const fresh = await commit(stored.etag);
    head.sha = fresh ? fresh.sha : stored.sha;
    head.etag = fresh ? fresh.etag : stored.etag;
  }
  if (!head.sha) throw new Error("site: no sha in the event, in the head or from github");
  log(`commit ${short(head.sha)} from ${event.source ?? "manual"}`);
  const line = await make(s3, head, stored);
  console.log(`done ${short(head.sha)} ${Date.now() - began}ms`);
  return line;
}

async function handler(request?: Request): Promise<Response> {
  let event: Event = { source: "manual" };
  if (request) {
    try {
      event = (await request.json()) as Event;
    } catch {
      event = { source: "manual" };
    }
  }
  return new Response(`${await once(event)}\n`);
}

export default { fetch: handler };

/* MAIN */

if (import.meta.main) {
  const raw = process.argv[2] ?? process.env.EVENT ?? '{"source":"manual"}';
  console.log(await once(JSON.parse(raw) as Event));
  process.exit(0);
}
