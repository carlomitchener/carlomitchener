import { expect, test } from "bun:test";
import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { build, forget, globals, guard, jsonScript, type Output, type Site, type Spec } from "./build.ts";

/* SITE */

const site = (config: Site["config"] = {}) =>
  ({
    config: {
      title: "Demo",
      root: "https://demo.test",
      llms: {
        about: "A demo tree.",
        links: [
          { href: "/raw/README.md", name: "README", note: "the readme" },
          { href: "/git/", name: "Code", note: "the tree" },
          { href: "/faq/", name: "FAQ" },
          { href: "/nowhere/", name: "Nowhere" },
        ],
      },
      ...config,
    },
    routes: [
      { route: "/", name: "Home", at: "2026-01-01" },
      { route: "/404.html", kind: "missing", hidden: true },
      { route: "/cart/", kind: "cart", hidden: true },
      { route: "/faq/", kind: "page", name: "FAQ", at: "2026-04-04" },
      { route: "/git/", kind: "gitdir", name: "demo", sitemap: true, at: "2026-02-02" },
      {
        route: "/git/README.md",
        kind: "gitfile",
        name: "README.md",
        hidden: true,
        sitemap: true,
        at: "2026-03-03",
        urls: [{ route: "/git/README.md" }, { route: "/raw/README.md" }],
      },
    ],
    copies: [],
  }) as unknown as Site;

const made = async (one = site(), spec = {} as unknown as Spec) => {
  const out = await globals(one, spec);
  const find = (path: string) => out.find((item: Output) => item.path === path)?.bytes as string | undefined;
  return { out, sitemap: find("sitemap.xml")!, robots: find("robots.txt")!, llms: find("llms.txt") };
};

/* SITEMAP */

test("the sitemap carries every shown route and every raw path with its own date and no hidden one", async () => {
  const { sitemap } = await made();
  expect(sitemap).toContain("<loc>https://demo.test/</loc><lastmod>2026-01-01</lastmod>");
  expect(sitemap).toContain("<loc>https://demo.test/faq/</loc><lastmod>2026-04-04</lastmod>");
  expect(sitemap).toContain("<loc>https://demo.test/git/</loc><lastmod>2026-02-02</lastmod>");
  expect(sitemap).toContain("<loc>https://demo.test/git/README.md</loc><lastmod>2026-03-03</lastmod>");
  expect(sitemap).toContain("<loc>https://demo.test/raw/README.md</loc><lastmod>2026-03-03</lastmod>");
  expect(sitemap).not.toContain("404.html");
  expect(sitemap).not.toContain("/cart/");
  expect(sitemap.match(/<url>/g)!.length).toBe(5);
});

/* ROBOTS */

test("robots names the crawlers it welcomes and points at the sitemap", async () => {
  const { robots } = await made();
  for (const agent of ["GPTBot", "ClaudeBot", "Claude-Web", "CCBot", "Google-Extended", "anthropic-ai", "PerplexityBot"]) {
    expect(robots).toContain(`User-agent: ${agent}\nAllow: /`);
  }
  expect(robots).toContain("User-agent: *\nAllow: /");
  expect(robots).toContain("Sitemap: https://demo.test/sitemap.xml");
});

/* LLMS */

test("llms.txt says what the site is and links only what the site publishes", async () => {
  const { llms } = await made();
  expect(llms).toContain("# Demo");
  expect(llms).toContain("A demo tree.");
  expect(llms).toContain("- [README](https://demo.test/raw/README.md): the readme");
  expect(llms).toContain("- [Code](https://demo.test/git/): the tree");
  expect(llms).toContain("- [FAQ](https://demo.test/faq/)");
  expect(llms).not.toContain("Nowhere");
});

test("no llms block in site.json means no llms.txt", async () => {
  const { llms } = await made(site({ llms: undefined }));
  expect(llms).toBeUndefined();
});

/* JSON-LD */

test("a headline that closes a script tag cannot close the ld+json block", () => {
  const out = jsonScript({ headline: "</script><img src=x onerror=alert(1)>" });
  expect(out).toBe('<script type="application/ld+json">{"headline":"\\u003c/script>\\u003cimg src=x onerror=alert(1)>"}</script>');
});

/* ICONS */

test("icons come through the spec: a glyph grid draws five files and no grid draws none", async () => {
  const rows = ["10101", "01010", "10101", "01010", "10101"];
  const { out } = await made(site(), { icons: { rows, svg: "<svg/>" } } as unknown as Spec);
  const paths = out.map((one) => one.path);
  for (const path of ["favicon.svg", "favicon.png", "apple-touch-icon.png", "icon-192.png", "icon-512.png"]) expect(paths).toContain(path);
  expect(out.find((one) => one.path === "favicon.svg")!.bytes).toBe("<svg/>");
  const png = out.find((one) => one.path === "favicon.png")!.bytes as Uint8Array;
  expect([...png.subarray(0, 8)]).toEqual([137, 80, 78, 71, 13, 10, 26, 10]);
  expect((await made()).out.map((one) => one.path)).not.toContain("favicon.png");
});

/* GUARD */

test("the guard passes a listed inline script, json data and a raw mirror, and throws on an unlisted one", () => {
  const known = new Set(["const a=1"]);
  expect(() => guard("index.html", "<script data-boot>const a=1</script>", known)).not.toThrow();
  expect(() => guard("index.html", '<script type="application/ld+json">{"a":1}</script>', known)).not.toThrow();
  expect(() => guard("index.html", '<script id="props" type="application/json">{"a":1}</script>', known)).not.toThrow();
  expect(() => guard("raw/site/demos/index.html", "<script>const b=2</script>", known)).not.toThrow();
  expect(() => guard("about/index.html", "<script>const b=2</script>", known)).toThrow(/boot list/);
});

/* BUILD */

const fresh = (name: string) => {
  const home = join(tmpdir(), `kitssg-${name}-${process.pid}`);
  rmSync(home, { recursive: true, force: true });
  mkdirSync(home, { recursive: true });
  return home;
};

test("prepare runs before the scan reads a bundle", async () => {
  const home = fresh("prepare");
  const out = join(home, "dist");
  const done = await build({
    root: home,
    out,
    config: { assets: [{ path: "ui", out: "ui", hash: true, files: ["a.css"] }] },
    prepare: () => {
      mkdirSync(join(home, "ui"), { recursive: true });
      writeFileSync(join(home, "ui", "a.css"), "b{}");
    },
    collect: () => ({ routes: [] }),
    render: () => [],
  });
  expect(done.site.styles).toEqual([done.site.asset("a.css")]);
  expect(existsSync(join(out, done.site.asset("a.css")))).toBe(true);
  rmSync(home, { recursive: true, force: true });
});

test("a second build drops a dead route's outputs, prunes their empty folders and sweeps a stale asset", async () => {
  const home = fresh("sweep");
  const out = join(home, "dist");
  mkdirSync(join(home, "ui"), { recursive: true });
  writeFileSync(join(home, "ui", "a.css"), "b{}");
  const spec = (routes: string[]): Spec => ({
    root: home,
    out,
    config: { assets: [{ path: "ui", out: "ui", hash: true }] },
    collect: () => ({ routes: routes.map((route) => ({ route })) }),
    render: (_site, route) => [{ path: `${route.route.slice(1)}index.html`, bytes: "<p>x</p>" }],
  });
  const first = await build(spec(["/deep/page/"]), { manifest: "manifest.json" });
  const was = first.site.asset("a.css");
  expect(existsSync(join(out, "deep/page/index.html"))).toBe(true);
  writeFileSync(join(home, "ui", "a.css"), "c{}");
  forget();
  const second = await build(spec([]), { manifest: "manifest.json" });
  expect(existsSync(join(out, was))).toBe(false);
  expect(existsSync(join(out, second.site.asset("a.css")))).toBe(true);
  expect(existsSync(join(out, "deep"))).toBe(false);
  expect(second.removed).toBe(2);
  rmSync(home, { recursive: true, force: true });
});

/* GIT OFF */

test("a spec with no git hooks still collects the repo and renders none of it", async () => {
  const home = fresh("gitoff");
  const out = join(home, "dist");
  writeFileSync(join(home, "README.md"), "# off\n");
  const done = await build({ root: home, out, config: { git: { root: "." } }, collect: () => ({ routes: [] }), render: () => [] });
  expect(done.site.routes.map((one) => one.route).sort()).toEqual(["/git/", "/git/README.md"]);
  expect(Object.keys(done.manifest)).toEqual([]);
  expect(existsSync(join(out, "git/README.md"))).toBe(false);
  expect(existsSync(join(out, "raw/README.md"))).toBe(false);
  rmSync(home, { recursive: true, force: true });
});
