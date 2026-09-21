import { afterAll, expect, test } from "bun:test";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { collect, posts, render } from "./blog.ts";
import { forget, walk, type Output, type Site, type Spec } from "./build.ts";

/* TREE */

const home = join(tmpdir(), `mrlyblog-${process.pid}`);

const post = (slug: string, text: string) => {
  mkdirSync(join(home, slug), { recursive: true });
  writeFileSync(join(home, slug, "index.md"), text);
};

const beside = (slug: string, path: string, body: string | Uint8Array) => {
  mkdirSync(join(home, slug, path.slice(0, path.lastIndexOf("/") + 1) || "."), { recursive: true });
  writeFileSync(join(home, slug, path), body);
};

post("older-news", "---\ntitle: Older\ndate: 2026-01-02\nlead: The first one.\n---\n\nWords.\n");
post("newer-news", "---\ntitle: Newer\ndate: 2026-05-06\nlead: The second one.\n---\n\n![the hero](files/hero.png)\n\nWords.\n");
beside("newer-news", "files/hero.png", new Uint8Array([137, 80, 78, 71, 0, 1]));
beside("newer-news", "NOTES.md", "# notes\n");

afterAll(() => rmSync(home, { recursive: true, force: true }));

/* SITE */

const site = (path = home) =>
  ({
    root: home,
    config: { inputs: { blog: { path, deep: true } } },
    input: () => ({ name: "blog", path, files: walk(path, true), missing: !walk(path, true).length }),
  }) as unknown as Site;

const spec = (out: string[] = []) =>
  ({
    blog: {
      page: (_: Site, leaf: { kind: string; slug: string; image: string; body: string; posts: { slug: string }[] }) => {
        out.push(`${leaf.kind}:${leaf.slug}:${leaf.image}:${leaf.posts.map((one) => one.slug).join(",")}`);
        return leaf.body;
      },
      md: (_: Site, text: string) => text,
    },
  }) as unknown as Spec;

const routes = (one = site()) => collect(one).routes;

const find = (list: Output[], path: string) => list.find((item) => item.path === path);

/* ORDER */

test("the listing lists the posts newest first", () => {
  forget();
  const one = site();
  expect(posts(one).map((p) => p.slug)).toEqual(["newer-news", "older-news"]);
  const listing = routes(one).find((r) => r.route === "/blog/")!;
  expect(listing.data).toEqual(["newer-news", "older-news"]);
  expect(listing.at).toBe("2026-05-06");
});

/* NOTHING */

test("a site with no blog folder gets no routes", () => {
  forget();
  const bare = { root: home, config: {}, input: () => ({ name: "blog", path: "", files: [], missing: true }) } as unknown as Site;
  expect(collect(bare).routes).toEqual([]);
  expect(posts(bare)).toEqual([]);
});

/* SIBLINGS */

test("every file beside index.md ships under the post with its own type", () => {
  forget();
  const one = site();
  const files = routes(one).find((r) => r.kind === "blogfiles")!;
  const out = render(one, files, spec());
  expect(find(out, "blog/newer-news/files/hero.png")?.type).toBe("image/png");
  expect(find(out, "blog/newer-news/NOTES.md")?.type).toBe("text/plain; charset=utf-8");
  expect(files.urls?.map((u) => u.route)).toEqual(["/blog/newer-news/files/hero.png"]);
});

/* FIGURE */

test("the first figure in the body is the og:image", () => {
  forget();
  const one = site();
  expect(posts(one)[0]!.image).toBe("/blog/newer-news/files/hero.png");
  expect(posts(one)[1]!.image).toBe("");
});

/* FRONT MATTER */

test("a post with no lead throws by name", () => {
  forget();
  post("broken-post", "---\ntitle: Broken\ndate: 2026-02-02\n---\n\nWords.\n");
  expect(() => posts(site())).toThrow(/broken-post names no lead/);
  rmSync(join(home, "broken-post"), { recursive: true, force: true });
});

/* SLUG */

test("a folder that is not a slug throws by name", () => {
  forget();
  post("Bad_Slug", "---\ntitle: Bad\ndate: 2026-02-02\nlead: No.\n---\n\nWords.\n");
  expect(() => posts(site())).toThrow(/Bad_Slug is not a slug/);
  rmSync(join(home, "Bad_Slug"), { recursive: true, force: true });
});
