import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";

/* WHERE */

export const NET = import.meta.dir;
export const REPO = resolve(NET, "..", "..");
export const HOST = resolve(process.env.MRLY_HOST ?? join(REPO, "..", "..", "mrlyprod", "mrlyprod"));
export const DATA_DIR = join(REPO, "data", relative(REPO, NET));
export const DIST = resolve(process.env.MRLY_DIST ?? join(DATA_DIR, "dist"));
const AVATAR = join(REPO, "avatar");
const BIRDS = join(REPO, "site", "public", "bird");
const PUBLIC = join(NET, "public");
const STATS = join(REPO, "site", "public", "stats.json");
const SKY = ["sky-core", "sky-mood", "sky-clouds", "sky-light", "sky-weather", "sky-bird", "sky"];
const FAVICONS = ["bird-32.png", "bird-192.png", "square-180.png"];

const read = (path: string) => readFileSync(path, "utf8");

/* LINKS */

function link(name: string, to: string) {
  const at = join(NET, name);
  if (!existsSync(at)) symlinkSync(relative(NET, to), at);
}

/* AVATAR */

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

/* MARK */

type Point = [number, number];

type Bird = {
  canvas: number;
  outline: { cubics: Point[][] };
  bird: { center: Point; height: number };
  gradient: { center: Point; start: number; colors: string[] };
  fringe: { angle: number; step: number; colors: string[] };
};

const BIRD = JSON.parse(read(join(AVATAR, "bird.json"))) as Bird;

const PALETTE = JSON.parse(read(join(AVATAR, "bird.js")).match(/const PALETTE = (\{[^\n]*\});/)![1]!) as Record<
  string,
  string
>;

const hex = (name: string) => PALETTE[name] ?? name;

const num = (v: number) => Math.round(v * 10) / 10;

export function outline(size: number, at: Point = [size / 2, size / 2], k = 0.8): string {
  const width = Math.max(...BIRD.outline.cubics.flat().map((p) => p[0]));
  const h = size * k;
  const P = ([x, y]: Point) => `${num(at[0] + (x - width / 2) * h)},${num(at[1] + (y - 0.5) * h)}`;
  const seg = BIRD.outline.cubics;
  return `M${P(seg[0]![0]!)}${seg.map(([, a, b, c]) => `C${P(a!)} ${P(b!)} ${P(c!)}`).join("")}Z`;
}

export function fringe(size: number, k = 0.8): Point[] {
  const step = (BIRD.fringe.step / BIRD.bird.height) * size * k * 1.6;
  const a = (BIRD.fringe.angle * Math.PI) / 180;
  return BIRD.fringe.colors.map((_, i) => [num(-(i + 1) * step * Math.cos(a)), num((i + 1) * step * Math.sin(a))]);
}

export function wheel(size: number, wedges = 72): string {
  const c = size / 2;
  const r = size;
  const n = BIRD.gradient.colors.length;
  const at = (deg: number) => {
    const pos = ((((deg - BIRD.gradient.start) % 360) + 360) % 360) / (360 / n);
    const i = Math.floor(pos) % n;
    const t = pos - Math.floor(pos);
    const a = hex(BIRD.gradient.colors[i]!);
    const b = hex(BIRD.gradient.colors[(i + 1) % n]!);
    const mix = [1, 3, 5].map((j) =>
      Math.round(parseInt(a.slice(j, j + 2), 16) * (1 - t) + parseInt(b.slice(j, j + 2), 16) * t),
    );
    return `#${mix.map((v) => v.toString(16).padStart(2, "0")).join("")}`;
  };
  const dir = (deg: number): Point => [Math.cos((deg * Math.PI) / 180), -Math.sin((deg * Math.PI) / 180)];
  const w = 360 / wedges;
  return Array.from({ length: wedges }, (_, i) => {
    const [x0, y0] = dir(i * w);
    const [x1, y1] = dir((i + 1.5) * w);
    return `<path d="M${c},${c}L${num(c + r * x0)},${num(c + r * y0)}L${num(c + r * x1)},${num(c + r * y1)}Z" fill="${at((i + 0.5) * w)}"/>`;
  }).join("");
}

export function mark(size = 256): string {
  const d = outline(size, [size / 2, size / 2], 0.62);
  const offs = fringe(size, 0.62);
  const rings = offs
    .map((_, i) => offs.length - 1 - i)
    .map(
      (i) =>
        `<use href="#b" fill="${hex(BIRD.fringe.colors[i]!)}" transform="translate(${offs[i]![0]} ${offs[i]![1]})"/>`,
    )
    .join("");
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}">`,
    "<style>.g{opacity:.55}.t{fill:#fff}@media (prefers-color-scheme:dark){.g{opacity:.9}.t{fill:#000}}</style>",
    `<defs><path id="b" d="${d}"/><clipPath id="c"><circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}"/></clipPath><filter id="f" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="${size / 14}"/></filter></defs>`,
    `<g clip-path="url(#c)"><g class="g" filter="url(#f)">${wheel(size)}</g></g>`,
    rings,
    '<use href="#b" class="t"/>',
    "</svg>",
  ].join("");
}

export function plate(back: [string, string], key: string): string {
  const size = 1024;
  const d = outline(size, [size / 2, size * 0.52], 0.56);
  const offs = fringe(size, 0.56);
  const rings = offs
    .map((_, i) => offs.length - 1 - i)
    .map(
      (i) =>
        `  <use href="#bird" fill="${hex(BIRD.fringe.colors[i]!)}" transform="translate(${offs[i]![0]} ${offs[i]![1]})" data-mono="hide"/>`,
    )
    .join("\n");
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}">`,
    "  <defs>",
    `    <linearGradient id="back" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${back[0]}"/><stop offset="1" stop-color="${back[1]}"/></linearGradient>`,
    `    <path id="bird" d="${d}"/>`,
    "  </defs>",
    `  <rect class="back" width="${size}" height="${size}" fill="url(#back)" data-key="${key}"/>`,
    rings,
    '  <use href="#bird" fill="#fff"/>',
    "</svg>",
    "",
  ].join("\n");
}

/* PUBLIC */

export function stage() {
  rmSync(PUBLIC, { recursive: true, force: true });
  mkdirSync(join(PUBLIC, "bird"), { recursive: true });
  writeFileSync(join(PUBLIC, "mark.svg"), mark());
  for (const file of FAVICONS) copyFileSync(join(BIRDS, file), join(PUBLIC, "bird", file));
  if (existsSync(STATS)) copyFileSync(STATS, join(PUBLIC, "stats.json"));
  writeFileSync(join(NET, "pages", "home", "icon.svg"), plate(["#2a2a2e", "#000000"], "#ffffff"));
  writeFileSync(join(NET, "apps", "bird", "icon.svg"), plate(["#8f90ff", "#4b40d2"], "#8f90ff"));
}

/* HOST */

export function prepare() {
  link("wasm", join(HOST, "net", "mrly.net", "wasm"));
  link("node_modules", join(HOST, "node_modules"));
  avatar();
  stage();
}

export async function host(verb: string, env: Record<string, string> = {}): Promise<number> {
  prepare();
  const proc = Bun.spawn(["bun", "run", verb], {
    cwd: HOST,
    env: { ...process.env, MRLY_ROOT: NET, ...env },
    stdout: "inherit",
    stderr: "inherit",
  });
  return proc.exited;
}

export const build = (dist = DIST) => host("build", { MRLY_DIST: dist });

if (import.meta.main) {
  const verb = process.argv[2] ?? "build";
  process.exit(await (verb === "build" ? build() : host(verb)));
}
