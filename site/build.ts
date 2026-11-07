import { existsSync, mkdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";

export const SITE = import.meta.dir;
export const REPO = resolve(SITE, "..");
export const HOST = resolve(process.env.MRLY_HOST ?? join(REPO, "..", "..", "mrlyprod", "mrlyprod"));
export const DATA_DIR = join(REPO, "data", relative(REPO, SITE));
export const DIST = resolve(process.env.MRLY_DIST ?? join(DATA_DIR, "dist"));
const AVATAR = join(REPO, "avatar");
const SKY = ["sky-core", "sky-mood", "sky-clouds", "sky-light", "sky-weather", "sky-bird", "sky"];

export const POLICY = [
  "default-src 'none'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "connect-src 'self'",
  "base-uri 'none'",
  "form-action 'none'",
  "frame-ancestors 'none'",
  "upgrade-insecure-requests",
];

export const HEADERS: Record<string, string> = {
  "Strict-Transport-Security": "max-age=63072000; includeSubDomains; preload",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
  "Cross-Origin-Opener-Policy": "same-origin",
  "Content-Security-Policy": POLICY.join("; "),
};

const SHADOW = [
  "const offs = [];",
  "const location = { search };",
  "const window = { visualViewport: null };",
  "const addEventListener = (type, fn, how) => {",
  '  if (type === "keydown") return;',
  "  globalThis.addEventListener(type, fn, how);",
  "  offs.push(() => globalThis.removeEventListener(type, fn, how));",
  "};",
].join("\n");

const read = (path: string) => readFileSync(path, "utf8");

function link(name: string, to: string) {
  const at = join(SITE, name);
  if (existsSync(at)) return;
  rmSync(at, { force: true });
  symlinkSync(to, at);
}

export function avatar() {
  const head = ["bird", "avatar"].map((name) => read(join(AVATAR, `${name}.js`))).join("\n");
  const [core, ...rest] = SKY.map((name) => read(join(AVATAR, `${name}.js`)));
  const out = [
    head,
    "export { Avatar, BIRD, PALETTE };",
    "export function sky(canvas, search) {",
    SHADOW,
    core,
    "G.canvas = canvas;",
    ...rest,
    "return { sky: Sky, mood: Mood, off: () => offs.splice(0).forEach((one) => one()) };",
    "}",
  ].join("\n");
  mkdirSync(DATA_DIR, { recursive: true });
  writeFileSync(join(DATA_DIR, "avatar.js"), out);
}

const run = (script: string, env: Record<string, string>, args: string[] = []) =>
  Bun.spawn(["bun", script, ...args], {
    cwd: join(HOST, "packages", "shell"),
    env: { ...process.env, MRLY_ROOT: SITE, ...env },
    stdout: "inherit",
    stderr: "inherit",
  }).exited;

function prepare(): Promise<number> {
  link("node_modules", join(HOST, "node_modules"));
  avatar();
  return run("scripts/wasm.ts", {}, ["--copy"]);
}

export async function build(dist = DIST): Promise<number> {
  const code = (await prepare()) || (await run("scripts/build.ts", { MRLY_DIST: dist }));
  if (code) return code;
  const rules = Object.entries(HEADERS).map(([key, value]) => `  ${key}: ${value}`);
  writeFileSync(join(dist, "_headers"), `/*\n${rules.join("\n")}\n`);
  return 0;
}

export async function dev(): Promise<number> {
  return (await prepare()) || run("scripts/dev.ts", {});
}

if (import.meta.main) process.exit(await (process.argv[2] === "dev" ? dev() : build()));
