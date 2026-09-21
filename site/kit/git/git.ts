import { existsSync, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { seti } from "../code/seti/seti.ts";
import { paint, version } from "./code.ts";
import { bytes, digest, escape, type Bytes, type Node, type Output, type Route, type Site, type Spec } from "../ssg/build.ts";

/* TYPES */

export type Git = { root: string; slug: string; branch: string; name: string; sitemap: boolean };

export type Kind = "dir" | "file";

export type Child = [string, number, Kind];

export type Dir = { dir: string; kids: Child[]; readme: string };

export type File = { path: string; size: number };

export type Leaf = {
  route: string;
  name: string;
  description: string;
  body: string;
  type?: string;
  wide?: boolean;
  bare?: boolean;
  code?: boolean;
  tree?: Node[];
};

export type Wood = { base: string; c: Twig[] };

export type Twig = { n: string; k: "d" | "f"; i?: string; c?: Twig[] };

export type Hooks = {
  page?: (site: Site, leaf: Leaf) => Bytes;
  md?: (site: Site, text: string, from: string) => string;
  code?: (text: string, lang: string) => Promise<string[] | null> | string[] | null;
  served?: (site: Site, path: string) => string | null;
};

export type Drawn = Hooks & { page: NonNullable<Hooks["page"]> };

/* CONFIG */

export function config(site: Site): Git | null {
  const decl = site.config.git as { root?: string; slug?: string; branch?: string; sitemap?: boolean } | undefined;
  if (!decl) return null;
  const slug = decl.slug ?? "";
  return {
    root: resolve(site.root, decl.root ?? "."),
    slug,
    branch: decl.branch ?? "main",
    name: slug.split("/").pop() || "code",
    sitemap: decl.sitemap ?? true,
  };
}

/* TREE */

const SKIP = new Set([".git", ".cache", ".venv", "__pycache__", "node_modules", "dist", "target", "data", "pkg"]);

function crawl(root: string, at: string, out: string[]) {
  for (const item of readdirSync(at ? join(root, at) : root, { withFileTypes: true })) {
    if (SKIP.has(item.name)) continue;
    const path = at ? `${at}/${item.name}` : item.name;
    if (item.isDirectory()) crawl(root, path, out);
    else if (item.isFile()) out.push(path);
  }
}

function tree(git: Git): string[] {
  if (existsSync(join(git.root, ".git"))) {
    const run = Bun.spawnSync(["git", "ls-files", "-z"], { cwd: git.root, stderr: "ignore" });
    const list = run.success ? run.stdout.toString().split("\0").filter((path) => path && existsSync(join(git.root, path))) : [];
    if (list.length) return list.sort();
  }
  const out: string[] = [];
  crawl(git.root, "", out);
  return out.sort();
}

/* ROUTES */

const stem = (path: string) => path.slice(path.lastIndexOf("/") + 1);

const anchor = (text: string) => text.replace(/[^A-Za-z0-9]+/g, "-").replace(/^-|-$/g, "").toLowerCase() || "top";

const home = (path: string) => (path.includes("/") ? path.slice(0, path.lastIndexOf("/")) : "");

const dotted = (path: string) => stem(path).includes(".");

export const named = (path: string) => (dotted(path) ? path : `${path}.txt`);

export const fileRoute = (path: string) => `/git/${named(path)}`;

export const dirRoute = (dir: string) => (dir ? `/git/${dir}/` : "/git/");

export const rawPath = (path: string) => `raw/${named(path)}`;

export const isGit = (route: Route) => route.kind === "gitdir" || route.kind === "gitfile";

export const href = (url: string) => escape(encodeURI(url).replace(/#/g, "%23").replace(/\?/g, "%3F"));

export function owner(path: string): string | null {
  if (!path.startsWith("/raw/")) return null;
  return `/git/${path.slice(5)}`;
}

/* COLLECT */

const KIDS = new WeakMap<Site, Map<string, Child[]>>();

export function collect(site: Site): { routes: Route[]; node: Node | null } {
  const git = config(site);
  if (!git) return { routes: [], node: null };
  const paths = tree(git);
  if (!paths.length) return { routes: [], node: null };
  const kids = new Map<string, Child[]>([["", []]]);
  KIDS.set(site, kids);
  for (const path of paths) {
    let at = "";
    for (const part of path.split("/").slice(0, -1)) {
      at = at ? `${at}/${part}` : part;
      if (!kids.has(at)) kids.set(at, []);
    }
  }
  const sizes = new Map<string, number>();
  for (const path of paths) {
    const size = statSync(join(git.root, path)).size;
    sizes.set(path, size);
    kids.get(home(path))!.push([stem(path), size, "file"]);
  }
  for (const dir of kids.keys()) if (dir) kids.get(home(dir))!.push([stem(dir), 0, "dir"]);
  for (const [dir, list] of kids) for (const one of list) if (one[2] === "dir") one[1] = kids.get(dir ? `${dir}/${one[0]}` : one[0])!.length;
  for (const list of kids.values()) {
    list.sort((a, b) => (a[2] !== b[2] ? (a[2] === "dir" ? -1 : 1) : a[0].localeCompare(b[0])));
  }
  const routes: Route[] = [];
  for (const dir of [...kids.keys()].sort()) {
    const list = kids.get(dir)!;
    const found = list.find((one) => one[2] === "file" && one[0].toLowerCase() === "readme.md");
    const readme = found ? (dir ? `${dir}/${found[0]}` : found[0]) : "";
    routes.push({
      route: dirRoute(dir),
      kind: "gitdir",
      name: dir || git.name,
      data: { dir, kids: list, readme } satisfies Dir,
      inputs: readme ? [join(git.root, readme)] : [],
      hidden: dir !== "",
      sitemap: true,
    });
  }
  for (const path of paths) {
    const source = join(git.root, path);
    routes.push({
      route: fileRoute(path),
      kind: "gitfile",
      name: stem(path),
      data: { path, size: sizes.get(path)! } satisfies File,
      source,
      inputs: [source],
      urls: [
        { route: fileRoute(path), name: stem(path) },
        { route: `/${rawPath(path)}`, name: stem(path) },
      ],
      hidden: true,
      sitemap: git.sitemap,
    });
  }
  return { routes, node: { name: "Code", href: "/git/" } };
}

/* EXPLORER */

const under = (open: string, path: string) => open === path || open.startsWith(`${path}/`);

const kindOf = (name: string) => seti(name).replace(/^si( si-)?/, "");

function branches(kids: Map<string, Child[]>, dir: string, open: string): Node[] {
  return (kids.get(dir) ?? []).map(([name, , kind]) => {
    const path = dir ? `${dir}/${name}` : name;
    if (kind === "file") return { name, href: fileRoute(path), icon: seti(name) };
    const along = under(open, path);
    return { name, href: dirRoute(path), lazy: path, nodes: along ? branches(kids, path, open) : [] };
  });
}

export function explorer(site: Site, dir: string): Node[] {
  const git = config(site);
  const kids = KIDS.get(site);
  if (!git || !kids) return site.nav;
  return [{ name: git.name, href: "/git/", lazy: "", nodes: branches(kids, "", dir) }];
}

function twigs(kids: Map<string, Child[]>, dir: string): Twig[] {
  return (kids.get(dir) ?? []).map(([name, , kind]) => {
    const path = dir ? `${dir}/${name}` : name;
    if (kind === "dir") return { n: name, k: "d", c: twigs(kids, path) };
    const i = kindOf(name);
    return i ? { n: name, k: "f", i } : { n: name, k: "f" };
  });
}

export function forest(site: Site): Wood | null {
  const kids = KIDS.get(site);
  return kids ? { base: "/git/", c: twigs(kids, "") } : null;
}

/* FINGERPRINT */

export function print(site: Site, route: Route, hooks?: Hooks): string {
  const parts: Bytes[] = ["git", route.route, route.kind ?? "", JSON.stringify(route.data ?? null), site.stamp];
  if (route.kind === "gitfile") parts.push(version, mirror(site, route, hooks) ?? "");
  for (const file of route.inputs ?? []) {
    parts.push(stem(file));
    parts.push(existsSync(file) ? bytes(file) : "gone");
  }
  return digest(parts).slice(0, 16);
}

/* LANGS */

const LANGS: Record<string, string> = {
  bash: "shellscript",
  c: "c",
  cjs: "javascript",
  css: "css",
  csv: "csv",
  h: "c",
  html: "html",
  js: "javascript",
  json: "json",
  jsx: "jsx",
  lock: "toml",
  md: "markdown",
  mjs: "javascript",
  py: "python",
  pyi: "python",
  rs: "rust",
  sh: "shellscript",
  svg: "xml",
  tex: "latex",
  toml: "toml",
  ts: "typescript",
  tsx: "tsx",
  wgsl: "wgsl",
  xml: "xml",
  yaml: "yaml",
  yml: "yaml",
  zsh: "shellscript",
};

export function lang(path: string): string {
  const name = stem(path).toLowerCase();
  const cut = name.lastIndexOf(".");
  return (cut > 0 ? LANGS[name.slice(cut + 1)] : undefined) ?? "text";
}

/* TYPES BY EXTENSION */

const TEXT = "text/plain; charset=utf-8";

const HTML = "text/html; charset=utf-8";

const MIME: Record<string, string> = {
  avif: "image/avif",
  gif: "image/gif",
  gz: "application/gzip",
  ico: "image/x-icon",
  jpeg: "image/jpeg",
  jpg: "image/jpeg",
  mp3: "audio/mpeg",
  mp4: "video/mp4",
  otf: "font/otf",
  pdf: "application/pdf",
  png: "image/png",
  svg: "image/svg+xml",
  ttf: "font/ttf",
  wasm: "application/wasm",
  wav: "audio/wav",
  webm: "video/webm",
  webp: "image/webp",
  woff: "font/woff",
  woff2: "font/woff2",
  zip: "application/zip",
};

const ext = (path: string) => {
  const name = stem(path).toLowerCase();
  const cut = name.lastIndexOf(".");
  return cut > 0 ? name.slice(cut + 1) : "";
};

const INERT = new Set(["svg"]);

export const mime = (path: string, text: boolean) =>
  text || INERT.has(ext(path)) ? TEXT : (MIME[ext(path)] ?? "application/octet-stream");

/* SHAPE */

const IMAGE = new Set(["avif", "gif", "ico", "jpeg", "jpg", "png", "svg", "webp"]);

const HUGE = 1 << 20;

const WIDE = 200 * 1024;

const size = (n: number) =>
  n < 1024 ? `${n} B` : n < 1024 * 1024 ? `${(n / 1024).toFixed(1)} kB` : `${(n / (1024 * 1024)).toFixed(1)} MB`;

export function reads(body: Uint8Array): string | null {
  const look = body.subarray(0, 8192);
  for (const one of look) if (one === 0) return null;
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(body);
  } catch {
    return null;
  }
}

/* SERVED */

function shelved(site: Site, git: Git, path: string, weight: number, hooks?: Hooks): string | null {
  const ship = site.ships.get(join(git.root, path));
  if (ship) return ship;
  const url = hooks?.served?.(site, path);
  if (!url) return null;
  const kind = ext(path);
  if (weight > HUGE || IMAGE.has(kind) || kind === "pdf") return url;
  return reads(bytes(join(git.root, path))) === null ? url : null;
}

export function mirror(site: Site, route: Route, hooks?: Hooks): string | null {
  if (route.kind !== "gitfile") return null;
  const git = config(site);
  if (!git) return null;
  const { path, size } = route.data as File;
  return shelved(site, git, path, size, hooks);
}

/* LINKS */

export function link(dir: string, url: string): string {
  if (/^(https?:|mailto:|#|\/)/.test(url)) return url;
  const cut = url.search(/[#?]/);
  const tail = cut < 0 ? "" : url.slice(cut);
  const head = cut < 0 ? url : url.slice(0, cut);
  const parts = (dir ? `${dir}/${head}` : head).split("/");
  const out: string[] = [];
  for (const part of parts) {
    if (part === "." || part === "") continue;
    if (part === "..") out.pop();
    else out.push(part);
  }
  const path = out.join("/");
  if (head.endsWith("/") || !path) return dirRoute(path) + tail;
  if (IMAGE.has(ext(path)) || ext(path) === "pdf") return `/${rawPath(path)}${tail}`;
  return fileRoute(path) + tail;
}

const github = (git: Git, path: string, dir: boolean) =>
  git.slug ? `https://github.com/${git.slug}/${dir ? "tree" : "blob"}/${git.branch}${path ? `/${path}` : ""}` : "";

function bar(git: Git, path: string, dir: boolean, tools: string[]): string {
  const parts = path ? path.split("/") : [];
  const crumbs = [`<a href="/git/">${escape(git.name)}</a>`];
  let at = "";
  parts.forEach((part, i) => {
    at = at ? `${at}/${part}` : part;
    const last = i === parts.length - 1;
    const to = last && !dir ? fileRoute(at) : dirRoute(at);
    crumbs.push(last ? `<b>${escape(part)}</b>` : `<a href="${href(to)}">${escape(part)}</a>`);
  });
  const side = tools.filter(Boolean).join(" · ");
  return `<nav class="bar" aria-label="Path"><span class="crumbs">${crumbs.join('<span class="sep">/</span>')}</span><span class="tools">${side}</span></nav>`;
}

/* BLURB */

const CAP = 160;

const clip = (text: string) => (text.length > CAP ? `${text.slice(0, CAP - 3).trimEnd()}...` : text);

export function gist(text: string): string {
  let out = "";
  for (const line of text.split("\n")) {
    const one = line.trim();
    if (!one) continue;
    out = out ? `${out} ${one}` : one;
    if (out.length >= CAP) break;
  }
  return clip(out.replace(/\s+/g, " ").replace(/^[#/*\-;%!<>=\s]+/, "").trim());
}

/* LISTING */

function rows(dir: string, kids: Child[]): string {
  const items = kids.map(([name, count, kind]) => {
    const path = dir ? `${dir}/${name}` : name;
    if (kind === "dir") {
      return `<li class="dir"><span class="ico" aria-hidden="true"></span><a href="${href(dirRoute(path))}">${escape(name)}/</a><span class="n">${count} item${count === 1 ? "" : "s"}</span></li>`;
    }
    return `<li><span class="${seti(name)}" aria-hidden="true"></span><a href="${href(fileRoute(path))}">${escape(name)}</a><span class="n">${size(count)}</span></li>`;
  });
  return `<ul class="files">\n${items.join("\n")}\n</ul>`;
}

function listing(site: Site, git: Git, route: Route, hooks: Drawn): Output[] {
  const { dir, kids, readme } = route.data as Dir;
  const tools = [
    github(git, dir, true) ? `<a href="${href(github(git, dir, true))}">GitHub</a>` : "",
  ];
  const head = bar(git, dir, true, tools);
  const file = readme ? join(git.root, readme) : "";
  const text = file && existsSync(file) ? (reads(bytes(file)) ?? "") : "";
  const intro = text && hooks.md ? `<div class="prose readme">${hooks.md(site, text, readme)}</div>` : "";
  const folders = kids.filter((one) => one[2] === "dir").length;
  const files = kids.length - folders;
  const name = dir || git.name;
  const lead = `${folders} director${folders === 1 ? "y" : "ies"} and ${files} file${files === 1 ? "" : "s"} in ${name}.`;
  const body = `${head}\n<div class="lede"><h1 id="${anchor(name)}">${escape(name)}</h1><p class="lead">${escape(lead)}</p></div>\n${intro}\n${rows(dir, kids)}`;
  const first = text ? gist(text) : "";
  const description = clip(first ? `${lead} ${first}` : lead);
  const at = dir ? `git/${dir}/index.html` : "git/index.html";
  return [{ path: at, bytes: hooks.page(site, { route: route.route, name, description, body, type: "website", code: true, tree: explorer(site, dir) }), type: HTML }];
}

/* CODE */

const NARROW = 2;

const WIDEST = 6;

const gutter = (count: number) => Math.min(WIDEST, Math.max(NARROW, String(count).length));

export async function block(text: string, kind: string, hook?: Hooks["code"]): Promise<string> {
  const lines = text.replace(/\r\n?/g, "\n").split("\n");
  if (lines.length > 1 && lines[lines.length - 1] === "") lines.pop();
  if (text.length > WIDE) return `<div class="code plain" data-lang="${escape(kind)}"><pre><code>${escape(text)}</code></pre></div>`;
  const painted = await (hook ?? paint)(text, kind);
  const out = lines.map((line, i) => {
    const n = i + 1;
    const inner = painted?.[i] ?? escape(line);
    return `<span class="line" id="L${n}"><a class="n" href="#L${n}">${n}</a><span class="t">${inner}</span></span>`;
  });
  return `<div class="code d${gutter(lines.length)}" data-lang="${escape(kind)}"><pre><code>${out.join("")}</code></pre></div>`;
}

/* FILE */

async function file(site: Site, git: Git, route: Route, hooks: Drawn): Promise<Output[]> {
  const { path, size: weight } = route.data as File;
  const source = join(git.root, path);
  const body = bytes(source);
  const away = shelved(site, git, path, weight, hooks);
  const raw = href(away ?? `/${rawPath(path)}`);
  const kind = ext(path);
  const huge = weight > HUGE;
  const text = huge || IMAGE.has(kind) || kind === "pdf" ? null : reads(body);
  const tongue = lang(path);
  const where = github(git, path, false);
  const tools = [`<a href="${raw}">Raw</a>`, where ? `<a href="${href(where)}">GitHub</a>` : ""];
  const head = bar(git, path, false, tools);
  let main: string;
  let note = "";
  if (text !== null && kind === "md" && hooks.md) {
    main = `<div class="prose readme">${hooks.md(site, text, path)}</div>`;
    note = `${size(weight)} · ${tongue}`;
  } else if (text !== null) {
    const count = text ? text.replace(/\n$/, "").split("\n").length : 0;
    main = await block(text, tongue, hooks.code);
    note = `${size(weight)} · ${tongue} · ${count} line${count === 1 ? "" : "s"}`;
  } else if (!huge && IMAGE.has(kind)) {
    main = `<figure class="shot"><img src="${raw}" alt="${escape(stem(path))}"></figure>`;
    note = `${size(weight)} · ${kind}`;
  } else if (!huge && kind === "pdf") {
    main = `<embed class="doc" src="${raw}" type="application/pdf">`;
    note = `${size(weight)} · pdf`;
  } else {
    main = `<p class="lead"><a href="${raw}">Download ${escape(stem(path))}</a> · ${size(weight)}</p>`;
    note = `${size(weight)} · ${kind || "binary"}`;
  }
  const plain = `${stem(path)} in ${git.name}, ${note}`;
  const description = (text !== null ? gist(text) : "") || plain;
  const shown = `${head}\n<div class="lede"><h1 id="${anchor(stem(path))}">${escape(stem(path))}</h1><p class="lead">${escape(note)}</p></div>\n${main}`;
  const out: Output[] = [
    {
      path: `git/${named(path)}`,
      bytes: hooks.page(site, { route: route.route, name: stem(path), description, body: shown, code: true, tree: explorer(site, home(path)) }),
      type: HTML,
    },
  ];
  if (!away) out.unshift({ path: rawPath(path), bytes: body, type: mime(path, text !== null) });
  return out;
}

/* RENDER */

export async function render(site: Site, route: Route, spec: Spec): Promise<Output[]> {
  const git = config(site);
  if (!git) throw new Error(`git: ${route.route} has no git block in site.json`);
  const hooks = spec.git as Drawn | undefined;
  if (!hooks?.page) throw new Error("git: site.json declares git but the spec carries no git.page");
  return route.kind === "gitdir" ? listing(site, git, route, hooks) : file(site, git, route, hooks);
}
