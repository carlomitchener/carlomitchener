/* KINDS */

const KINDS: Record<string, string> = {
  ".gitignore": "git",
  ".prettierignore": "config",
  ".prettierrc": "json",
  ".python-version": "python",
  license: "license",
  astro: "html",
  c: "c",
  css: "css",
  csv: "csv",
  h: "h",
  html: "html",
  ico: "favicon",
  js: "js",
  json: "json",
  lock: "lock",
  md: "markdown",
  mjs: "js",
  png: "image",
  py: "python",
  rs: "rust",
  sh: "shell",
  svg: "svg",
  toml: "config",
  ts: "ts",
  tsx: "react",
  ttf: "font",
  wgsl: "cuda",
  woff: "font",
  woff2: "font",
};

/* SETI */

export function seti(path: string): string {
  const low = path.toLowerCase();
  const cut = low.lastIndexOf("/");
  const name = cut < 0 ? low : low.slice(cut + 1);
  const dot = name.lastIndexOf(".");
  const key = KINDS[name] ?? (dot > 0 ? KINDS[name.slice(dot + 1)] : undefined);
  return key === undefined ? "si" : `si si-${key}`;
}
