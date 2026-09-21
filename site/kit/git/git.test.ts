import { afterAll, expect, test } from "bun:test";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { block, collect, dirRoute, explorer, fileRoute, forest, gist, href, lang, link, mime, named, owner, rawPath, render } from "./git.ts";
import { paint } from "./code.ts";
import type { Site, Spec } from "../ssg/build.ts";

const shiki = await import("@shikijs/core").then(
  () => true,
  () => false,
);

/* TREE */

const home = join(tmpdir(), `mrlygit-${process.pid}`);

mkdirSync(join(home, "src"), { recursive: true });
writeFileSync(join(home, "README.md"), "# demo\n\nA tree.\n");
writeFileSync(join(home, "LICENSE"), "MIT\n");
writeFileSync(join(home, ".gitignore"), "dist\n");
writeFileSync(join(home, "src", "a.rs"), "fn main() {}\n");

afterAll(() => rmSync(home, { recursive: true, force: true }));

const site = (git: unknown) => ({ root: home, config: git ? { git } : {}, ships: new Map<string, string>() }) as unknown as Site;

/* RULES */

test("a file with no extension routes to .txt", () => {
  expect(named("LICENSE")).toBe("LICENSE.txt");
  expect(fileRoute("scripts/bootstrap")).toBe("/git/scripts/bootstrap.txt");
  expect(rawPath("LICENSE")).toBe("raw/LICENSE.txt");
});

test("a file with an extension keeps its path", () => {
  expect(fileRoute("crates/a/src/lib.rs")).toBe("/git/crates/a/src/lib.rs");
  expect(fileRoute(".gitignore")).toBe("/git/.gitignore");
  expect(rawPath("x/y.png")).toBe("raw/x/y.png");
});

test("a directory route ends in a slash", () => {
  expect(dirRoute("")).toBe("/git/");
  expect(dirRoute("crates/a")).toBe("/git/crates/a/");
});

test("a raw path names its own file route", () => {
  expect(owner("/raw/src/a.rs")).toBe("/git/src/a.rs");
  expect(owner("/git/src/a.rs")).toBe(null);
});

test("an href percent-encodes a path and html-escapes the rest", () => {
  expect(href(fileRoute("notes/a b#c&d.md"))).toBe("/git/notes/a%20b%23c&amp;d.md");
  expect(href(dirRoute("notes/a b"))).toBe("/git/notes/a%20b/");
});

test("a raw svg is served as text, a raw png keeps its image type", () => {
  expect(mime("files/figures/logo.svg", false)).toBe("text/plain; charset=utf-8");
  expect(mime("files/figures/logo.png", false)).toBe("image/png");
});

test("a language comes from the extension", () => {
  expect(lang("src/a.rs")).toBe("rust");
  expect(lang("LICENSE")).toBe("text");
});

test("a repo-relative link lands on its own route", () => {
  expect(link("crates/a", "src/lib.rs")).toBe("/git/crates/a/src/lib.rs");
  expect(link("crates/a", "../b/README.md#top")).toBe("/git/crates/b/README.md#top");
  expect(link("docs", "shot.png")).toBe("/raw/docs/shot.png");
  expect(link("docs", "https://mrly.net")).toBe("https://mrly.net");
});

/* EXPLORER */

test("the explorer opens the path to the page and leaves the rest lazy", () => {
  const one = site({ root: ".", slug: "mrlyprod/mrlyprod" });
  one.nav = [{ name: "Home", href: "/" }, { name: "Code", href: "/git/" }];
  collect(one);
  const [code, ...rest] = explorer(one, "src");
  expect(rest).toEqual([]);
  expect(code.name).toBe("mrlyprod");
  expect(code.nodes!.map((kid) => kid.name)).toEqual(["src", ".gitignore", "LICENSE", "README.md"]);
  expect(code.nodes![0]).toEqual({ name: "src", href: "/git/src/", lazy: "src", nodes: [{ name: "a.rs", href: "/git/src/a.rs", icon: "si si-rust" }] });
  expect(explorer(one, "")[0].nodes![0].nodes).toEqual([]);
  expect(forest(one)).toEqual({ base: "/git/", c: [{ n: "src", k: "d", c: [{ n: "a.rs", k: "f", i: "rust" }] }, { n: ".gitignore", k: "f", i: "git" }, { n: "LICENSE", k: "f", i: "license" }, { n: "README.md", k: "f", i: "markdown" }] });
});

/* COLLECT */

test("no git block in site.json means no routes", () => {
  expect(collect(site(null))).toEqual({ routes: [], node: null });
});

test("a git block routes every tracked file and every directory", () => {
  const { routes, node } = collect(site({ root: ".", slug: "mrlyprod/mrlyprod" }));
  const names = routes.map((one) => one.route).sort();
  expect(names).toEqual(["/git/", "/git/.gitignore", "/git/LICENSE.txt", "/git/README.md", "/git/src/", "/git/src/a.rs"]);
  expect(node).toEqual({ name: "Code", href: "/git/" });
  const root = routes.find((one) => one.route === "/git/")!;
  const kids = (root.data as { kids: [string, number, string][] }).kids;
  expect(kids.map((one) => one[0])).toEqual(["src", ".gitignore", "LICENSE", "README.md"]);
  expect(kids[0]).toEqual(["src", 1, "dir"]);
  expect(root.hidden).toBe(false);
  const one = routes.find((one) => one.route === "/git/src/a.rs")!;
  expect(one.hidden).toBe(true);
  expect(one.sitemap).toBe(true);
  expect(one.urls).toEqual([
    { route: "/git/src/a.rs", name: "a.rs" },
    { route: "/raw/src/a.rs", name: "a.rs" },
  ]);
});

/* SERVED */

test("a binary the site already serves loses its raw copy and points at the served url", async () => {
  const shelf = join(tmpdir(), `mrlyraw-${process.pid}`);
  mkdirSync(shelf, { recursive: true });
  writeFileSync(join(shelf, "logo.png"), Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10, 0, 1]));
  writeFileSync(join(shelf, "seal.bin"), Uint8Array.from([0, 1, 2, 3]));
  const one = { root: shelf, config: { git: { root: "." } }, nav: [], ships: new Map<string, string>() } as unknown as Site;
  const { routes } = collect(one);
  const spec = { git: { page: (_s: Site, leaf: { body: string }) => leaf.body, served: (_s: Site, path: string) => (path === "logo.png" ? "/figures/logo.png" : null) } } as unknown as Spec;
  const shown = await render(one, routes.find((r) => r.route === "/git/logo.png")!, spec);
  expect(shown.map((item) => item.path)).toEqual(["git/logo.png"]);
  expect(shown[0].bytes).toContain('<img src="/figures/logo.png"');
  const kept = await render(one, routes.find((r) => r.route === "/git/seal.bin")!, spec);
  expect(kept.map((item) => item.path)).toEqual(["raw/seal.bin", "git/seal.bin"]);
  rmSync(shelf, { recursive: true, force: true });
});

/* SHIPPED */

test("a file the build ships verbatim loses its raw copy whatever its type", async () => {
  const shelf = join(tmpdir(), `mrlyship-${process.pid}`);
  mkdirSync(shelf, { recursive: true });
  writeFileSync(join(shelf, "make.py"), "print(1)\n");
  const one = { root: shelf, config: { git: { root: "." } }, nav: [], ships: new Map([[join(shelf, "make.py"), "/blog/post/make.py"]]) } as unknown as Site;
  const { routes } = collect(one);
  const spec = { git: { page: (_s: Site, leaf: { body: string }) => leaf.body } } as unknown as Spec;
  const shown = await render(one, routes.find((r) => r.route === "/git/make.py")!, spec);
  expect(shown.map((item) => item.path)).toEqual(["git/make.py"]);
  expect(shown[0].bytes).toContain('<a href="/blog/post/make.py">Raw</a>');
  rmSync(shelf, { recursive: true, force: true });
});

/* BLURB */

test("a description is the first lines collapsed, stripped and clipped", () => {
  expect(gist("# git\n\nThe code viewer.\n")).toBe("git The code viewer.");
  expect(gist("\n\n   use   crate::a;\nuse crate::b;\n")).toBe("use crate::a; use crate::b;");
  expect(gist("")).toBe("");
  const long = gist(`${"word ".repeat(80)}\n`);
  expect(long.length).toBeLessThanOrEqual(160);
  expect(long.endsWith("...")).toBe(true);
});

/* CODE */

test("a code block numbers its lines and a huge one stays plain", async () => {
  const one = await block("let a = 1;\nlet b = 2;\n", "typescript");
  expect(one).toContain('<span class="line" id="L2"><a class="n" href="#L2">2</a>');
  expect(one).not.toContain("L3");
  expect(one).toContain('<div class="code d2"');
  expect(await block("x\n".repeat(120000), "text")).toContain('<div class="code plain"');
});

test("a paint hook fills the line body and nothing else", async () => {
  const out = await block("a\nb\n", "text", () => ["<i>a</i>", "<i>b</i>"]);
  expect(out).toContain('<span class="t"><i>a</i></span>');
});

test("the gutter class counts the digits of the last line", async () => {
  expect(await block("x\n".repeat(400), "text")).toContain('<div class="code d3"');
});

/* PAINT */

test.skipIf(!shiki)("a rust snippet paints one string per line", async () => {
  const out = await paint("fn main() {\n    let a = 1;\n}\n", "rust");
  expect(out).not.toBeNull();
  expect(out!.length).toBe(3);
  expect(out![1]).toContain('<span class="tk-keyword">let</span>');
  expect(out!.join("")).not.toContain("style=");
});

test("an unknown extension paints nothing", async () => {
  expect(await paint("hello\n", lang("notes.bin"))).toBeNull();
  expect(await paint("hello\n", "text")).toBeNull();
});

test.skipIf(!shiki)("a painted block carries tk classes into the line body", async () => {
  const out = await block("fn a() {}\n", "rust");
  expect(out).toContain('<span class="t"><span class="tk-keyword">fn</span>');
});
