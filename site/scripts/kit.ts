import { cpSync, existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

const org = resolve(import.meta.dir, "..");
const home = join(org, "data", "mrlyjs");
const lock = join(org, "mrlyjs.lock");
const REPO = "mrlyprod/mrlyprod";
const KEEP = "pkgs/js/mrlyjs/";
const HEAD = `https://api.github.com/repos/${REPO}/commits/main`;

/* TAR */

const text = (data: Uint8Array, from: number, to: number) => {
  const end = data.indexOf(0, from);
  return new TextDecoder().decode(data.subarray(from, end < 0 || end > to ? to : end));
};

const octal = (data: Uint8Array, from: number, to: number) => parseInt(text(data, from, to).trim() || "0", 8);

function pax(block: Uint8Array) {
  const out: Record<string, string> = {};
  for (const line of new TextDecoder().decode(block).split("\n")) {
    const m = line.match(/^\d+ ([^=]+)=(.*)$/);
    if (m) out[m[1]] = m[2];
  }
  return out;
}

function untar(tar: Uint8Array, into: string) {
  let at = 0;
  let next: Record<string, string> = {};
  let files = 0;
  while (at + 512 <= tar.length) {
    const head = tar.subarray(at, at + 512);
    if (head.every((b) => b === 0)) break;
    const size = octal(head, 124, 136);
    const kind = String.fromCharCode(head[156]);
    const prefix = text(head, 345, 500);
    let name = next.path ?? (prefix ? `${prefix}/${text(head, 0, 100)}` : text(head, 0, 100));
    const body = tar.subarray(at + 512, at + 512 + size);
    at += 512 + Math.ceil(size / 512) * 512;
    if (kind === "x") {
      next = pax(body);
      continue;
    }
    next = {};
    if (kind === "g" || kind === "L") continue;
    name = name.replace(/^[^/]+\//, "");
    if (!name.startsWith(KEEP)) continue;
    const path = join(into, name.slice(KEEP.length));
    if (kind === "5" || name.endsWith("/")) mkdirSync(path, { recursive: true });
    else if (kind === "0" || kind === "\0") {
      mkdirSync(dirname(path), { recursive: true });
      writeFileSync(path, body);
      files++;
    }
  }
  return files;
}

/* FETCH */

const sha = () => readFileSync(lock, "utf8").trim();

async function head() {
  const reply = await fetch(HEAD, { headers: { accept: "application/vnd.github+json" } });
  if (!reply.ok) throw new Error(`HTTP ${reply.status}`);
  return ((await reply.json()) as { sha: string }).sha;
}

async function pull(at: string) {
  const reply = await fetch(`https://codeload.github.com/${REPO}/tar.gz/${at}`);
  if (!reply.ok) throw new Error(`HTTP ${reply.status}`);
  const tar = Bun.gunzipSync(new Uint8Array(await reply.arrayBuffer()));
  const fresh = join(org, "data", "mrlyjs.next");
  rmSync(fresh, { recursive: true, force: true });
  const files = untar(tar, fresh);
  if (!existsSync(join(fresh, "ui", "chrome.jsx"))) throw new Error(`${at} carries no pkgs/js/mrlyjs/ui`);
  rmSync(home, { recursive: true, force: true });
  renameSync(fresh, home);
  return files;
}

export async function kit(): Promise<string> {
  const local = process.env.MRLYJS;
  if (local) {
    const from = resolve(local);
    if (!existsSync(join(from, "ui", "chrome.jsx"))) throw new Error(`kit: MRLYJS=${from} holds no ui/chrome.jsx`);
    rmSync(home, { recursive: true, force: true });
    mkdirSync(dirname(home), { recursive: true });
    cpSync(from, home, { recursive: true });
    console.log(`kit: copied from ${from}`);
    return home;
  }
  try {
    const files = await pull(sha());
    console.log(`kit: fetched ${files} files at ${sha().slice(0, 8)}`);
  } catch (reason) {
    if (!existsSync(join(home, "ui", "chrome.jsx"))) throw new Error(`kit: fetch failed (${reason}) and no cache at ${home}; set MRLYJS to a local checkout`);
    console.warn(`kit: fetch failed (${reason}), building from the cached copy`);
  }
  return home;
}

if (import.meta.main) {
  if (!process.argv.includes("--hold")) {
    const at = await head();
    writeFileSync(lock, `${at}\n`);
    console.log(`kit: mrlyjs.lock now ${at}`);
  }
  await kit();
}
