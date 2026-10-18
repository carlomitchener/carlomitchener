import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";

/* WHERE */

export const SITE = import.meta.dir;
export const REPO = resolve(SITE, "..");
export const DIST = join(SITE, "dist");
const DATA_DIR = join(REPO, "data", relative(REPO, SITE));
const AVATAR = join(REPO, "avatar");
const SRC = join(SITE, "src");
const GITHUB = "https://github.com/carlomitchener/carlomitchener";
const ORIGIN = "https://carlomitchener.com";
const SKY = ["bird", "avatar", "sky-core", "sky-mood", "sky-clouds", "sky-weather", "sky-bird", "sky"];
const ICONS = ["bird-32.png", "bird-192.png", "square-180.png"];

/* HEADERS */

const CSP = [
  "default-src 'none'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "connect-src 'self'",
  "base-uri 'none'",
  "form-action 'none'",
  "frame-ancestors 'none'",
  "upgrade-insecure-requests",
].join("; ");

export const HEADERS: Record<string, string> = {
  "Strict-Transport-Security": "max-age=63072000; includeSubDomains; preload",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
  "Cross-Origin-Opener-Policy": "same-origin",
  "Content-Security-Policy": CSP,
};

/* README */

const read = (path: string) => readFileSync(path, "utf8");

function github(href: string) {
  if (/^([a-z][a-z0-9+.-]*:|\/\/|#)/i.test(href)) return href;
  const [path = "", hash = ""] = href.split("#");
  const clean = path.replace(/^\.?\//, "").replace(/\/$/, "");
  const full = join(REPO, clean);
  const tree = !clean || path.endsWith("/") || (existsSync(full) && statSync(full).isDirectory());
  return `${GITHUB}/${tree ? "tree" : "blob"}/main/${clean}${hash ? `#${hash}` : ""}`;
}

function readme() {
  const html = Bun.markdown.html(read(join(REPO, "README.md")), { headings: { ids: true } });
  return html
    .replace(/<thead>\s*<tr>(?:<th[^>]*><\/th>)+<\/tr>\s*<\/thead>\s*/g, "")
    .replace(/href="([^"]*)"/g, (_, href: string) => `href="${github(href)}"`);
}

function summary(html: string) {
  const first = html.match(/<p>([\s\S]*?)<\/p>/)?.[1] ?? "";
  return first.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
}

/* PAGE */

function page(opts: { title: string; description: string; canonical?: string; splash?: boolean; body: string }) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${opts.title}</title>
<meta name="description" content="${opts.description.replace(/"/g, "&quot;")}">
<meta name="color-scheme" content="light dark">
<meta name="theme-color" media="(prefers-color-scheme: light)" content="#ffffff">
<meta name="theme-color" media="(prefers-color-scheme: dark)" content="#000000">
${opts.canonical ? `<link rel="canonical" href="${opts.canonical}">\n` : ""}<link rel="icon" href="/bird/bird-32.png" sizes="32x32" type="image/png">
<link rel="icon" href="/bird/bird-192.png" sizes="192x192" type="image/png">
<link rel="apple-touch-icon" href="/bird/square-180.png">
<link rel="stylesheet" href="/site.css">
<script defer src="/sky.js"></script>
${opts.splash ? "<noscript><style>#splash { display: none; }</style></noscript>\n" : ""}</head>
<body>
<div class="sky"><canvas id="sky"></canvas></div>
${opts.splash ? '<div id="splash"></div>\n' : ""}${opts.body}
</body>
</html>
`;
}

/* BUILD */

async function sky() {
  mkdirSync(DATA_DIR, { recursive: true });
  const all = join(DATA_DIR, "sky.js");
  const parts = [...SKY.map((name) => join(AVATAR, `${name}.js`)), join(SRC, "mount.js"), join(AVATAR, "splash.js")];
  writeFileSync(all, parts.map(read).join("\n"));
  const out = await Bun.build({ entrypoints: [all], outdir: DIST, naming: "sky.js", format: "iife", target: "browser", minify: true });
  if (!out.success) throw new Error(`site: sky bundle failed\n${out.logs.map(String).join("\n")}`);
}

export async function build() {
  rmSync(DIST, { recursive: true, force: true });
  mkdirSync(join(DIST, "bird"), { recursive: true });
  const body = readme();
  const name = body.match(/<h1[^>]*>([\s\S]*?)<\/h1>/)?.[1]?.replace(/<[^>]+>/g, "").replace(/^Hi, I'm /, "") ?? "Carlo Mitchener";
  writeFileSync(join(DIST, "index.html"), page({ title: name, description: summary(body), canonical: `${ORIGIN}/`, splash: true, body: `<main class="page"><article class="readme">\n${body}</article></main>\n<div class="fog"></div>` }));
  writeFileSync(join(DIST, "404.html"), page({ title: "Nothing here", description: "Nothing here.", body: `<main class="lost"><div><p>Nothing here</p><a href="/">Home</a></div></main>` }));
  const css = [join(SRC, "site.css"), join(AVATAR, "splash.css")];
  writeFileSync(join(DIST, "site.css"), css.map(read).join("\n"));
  for (const icon of ICONS) copyFileSync(join(SITE, "public", "bird", icon), join(DIST, "bird", icon));
  writeFileSync(join(DIST, "_headers"), `/*\n${Object.entries(HEADERS).map(([k, v]) => `  ${k}: ${v}`).join("\n")}\n`);
  await sky();
  console.log(`site: built ${relative(REPO, DIST)}/`);
}

if (import.meta.main) await build();
