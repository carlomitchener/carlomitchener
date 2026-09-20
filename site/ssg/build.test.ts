import { expect, test } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { globals, guard, walk, type Output, type Site, type Spec } from "./build.ts";
import { pages } from "../scripts/build.ts";

/* SITE */

const site = () =>
  ({
    config: {
      title: "Demo",
      root: "https://demo.test",
      llms: {
        about: "A demo shop.",
        links: [
          { href: "/shop/designs/", name: "Designs", note: "every design" },
          { href: "/faq/", name: "FAQ" },
          { href: "/nowhere/", name: "Nowhere" },
        ],
      },
    },
    routes: [
      { route: "/", name: "Home", at: "2026-01-01" },
      { route: "/404.html", kind: "missing", hidden: true },
      { route: "/cart/", kind: "cart", hidden: true },
      { route: "/shop/designs/", kind: "designs", name: "Designs", at: "2026-02-02" },
      { route: "/faq/", kind: "page", name: "FAQ", at: "2026-03-03" },
      { route: "/feed/7f3a91c0/", kind: "post", name: "7f3a91c0", at: "2026-04-04" },
    ],
  }) as unknown as Site;

const made = async () => {
  const out = await globals(site(), {} as unknown as Spec);
  const find = (path: string) => out.find((one: Output) => one.path === path)!.bytes as string;
  return { sitemap: find("sitemap.xml"), robots: find("robots.txt"), llms: find("llms.txt") };
};

/* SITEMAP */

test("the sitemap carries every shown route with its own date and no hidden one", async () => {
  const { sitemap } = await made();
  expect(sitemap).toContain("<loc>https://demo.test/</loc><lastmod>2026-01-01</lastmod>");
  expect(sitemap).toContain("<loc>https://demo.test/shop/designs/</loc><lastmod>2026-02-02</lastmod>");
  expect(sitemap).toContain("<loc>https://demo.test/feed/7f3a91c0/</loc><lastmod>2026-04-04</lastmod>");
  expect(sitemap).not.toContain("404.html");
  expect(sitemap).not.toContain("/cart/");
  expect(sitemap.match(/<url>/g)!.length).toBe(4);
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
  expect(llms).toContain("A demo shop.");
  expect(llms).toContain("- [Designs](https://demo.test/shop/designs/): every design");
  expect(llms).toContain("- [FAQ](https://demo.test/faq/)");
  expect(llms).not.toContain("Nowhere");
});

/* CSS */

const selectors = (css: string) => {
  const out: string[] = [];
  let depth = 0;
  let buf = "";
  for (const c of css.replace(/\/\*[\s\S]*?\*\//g, "")) {
    if (c === "{") {
      if (depth === 0) out.push(buf.trim().replace(/\s+/g, " "));
      depth++;
      buf = "";
    } else if (c === "}") {
      depth--;
      if (depth < 0) throw new Error("stray brace");
      buf = "";
    } else if (depth === 0) buf += c;
  }
  if (depth !== 0) throw new Error("unclosed brace");
  return out;
};

test("the site css never repeats a top-level selector with another rule between", () => {
  const home = join(import.meta.dir, "..", "ui");
  for (const file of walk(home, false).filter((f) => f.endsWith(".css"))) {
    const list = selectors(readFileSync(file, "utf8"));
    const last = new Map<string, number>();
    list.forEach((sel, n) => {
      const was = last.get(sel);
      if (was !== undefined && list.slice(was + 1, n).some((other) => other !== sel)) throw new Error(`${file}: '${sel}' at ${was} and ${n}`);
      last.set(sel, n);
    });
  }
});

/* LINKS */

const HREF = /href="([^"]+)"/g;

const BUCKET = /^\/(cdn|automator|stats)\/.+\.[a-z0-9]+$/;

function lands(out: string, href: string) {
  const path = href.split(/[#?]/)[0];
  if (!path) return true;
  const hit = join(out, path);
  return existsSync(path.endsWith("/") ? join(hit, "index.html") : hit);
}

test("every internal link the built site carries lands on an output in dist", async () => {
  const done = await pages();
  const out = done.site.out;
  const broken: string[] = [];
  for (const file of walk(out).filter((one) => one.endsWith(".html"))) {
    const html = readFileSync(file, "utf8");
    for (const [, href] of html.matchAll(HREF)) {
      if (!href.startsWith("/") || BUCKET.test(href)) continue;
      if (!lands(out, href)) broken.push(`${relative(out, file)} -> ${href}`);
    }
  }
  expect(broken).toEqual([]);
}, 120000);

/* GUARD */

test("the guard passes a listed inline script and json data, and throws on an unlisted script", () => {
  const known = new Set(["const a=1"]);
  expect(() => guard("index.html", "<script>const a=1</script>", known)).not.toThrow();
  expect(() => guard("index.html", '<script id="props" type="application/json">{"a":1}</script>', known)).not.toThrow();
  expect(() => guard("about/index.html", "<script>const b=2</script>", known)).toThrow(/boot list/);
});

/* ROUTES */

test("the status page is gone and the automator and the stats pages stand in its place", async () => {
  const done = await pages();
  const routes = done.site.routes.map((one) => one.route);
  expect(routes).toContain("/automator/");
  expect(routes).toContain("/stats/");
  expect(routes).not.toContain("/status/");
}, 120000);
