import { describe, expect, test } from "bun:test";
import { cache, IMMUTABLE, kind, mine, REVALIDATE, rules, spread, sweep, typing, type Lister } from "./push.ts";
import type { Manifest } from "./ssg/build.ts";

const SHOP = rules(["(^|/)lib-[^/]+\\.js$", "(^|/)lib-[^/]+\\.css$", "(^|/)js/[^/]+\\.js$", "\\.wasm$", "-[0-9a-f]{8}\\.[^./]+$"]);

const NET = rules(["(^|/)lib-[^/]+\\.js$", "(^|/)lib-[^/]+\\.css$", "\\.wasm$", "-[0-9a-f]{8}\\.[^./]+$"]);

const GUARD = ["cdn/", "art/", "automator/automator.json", "stats/stats.json"];

const MANIFEST: Manifest = {
  "/": { hash: "a", at: "2026-09-21", outputs: ["index.html", "props.json"], types: { "props.json": "application/json" } },
  "/shop/": { hash: "b", at: "2026-09-21", outputs: ["shop/index.html"] },
  "@ui/tokens-8a0bcf6d.css": { hash: "c", at: "2026-09-21", outputs: ["ui/tokens-8a0bcf6d.css"] },
};

const page = (contents: string[], prefixes: string[]) => ({
  contents: contents.map((key) => ({ key })),
  commonPrefixes: prefixes.map((prefix) => ({ prefix })),
  isTruncated: false,
  nextContinuationToken: null,
});

const TREE: Record<string, ReturnType<typeof page>> = {
  "site/": page(["site/index.html"], ["site/art/", "site/cdn/", "site/shop/", "site/ui/"]),
  "site/shop/": page(["site/shop/index.html"], []),
  "site/ui/": page(["site/ui/tokens-8a0bcf6d.css"], []),
  "site/art/": page(["site/art/never.png"], []),
  "site/cdn/": page(["site/cdn/never.js"], []),
};

const fake: Lister = { list: async ({ prefix }) => TREE[prefix] ?? page([], []) };

describe("push", () => {
  test("a hashed name is immutable for a year, every other name revalidates", () => {
    expect(cache("js/main.js", SHOP)).toBe(IMMUTABLE);
    expect(cache("ui/tokens-8a0bcf6d.css", SHOP)).toBe(IMMUTABLE);
    expect(cache("index.html", SHOP)).toBe(REVALIDATE);
    expect(cache("js/main.js", NET)).toBe(REVALIDATE);
  });

  test("a type declared in the manifest wins over the extension", () => {
    expect(typing(MANIFEST).get("props.json")).toBe("application/json");
    expect(typing(MANIFEST).has("index.html")).toBe(false);
    expect(kind("index.html")).toBe("text/html; charset=utf-8");
  });

  test("every output points back at the record that wrote it", () => {
    expect([...spread(MANIFEST)]).toEqual([
      ["index.html", "/"],
      ["props.json", "/"],
      ["shop/index.html", "/shop/"],
      ["ui/tokens-8a0bcf6d.css", "@ui/tokens-8a0bcf6d.css"],
    ]);
  });

  test("the guard owns a prefix and a single key alike", () => {
    expect(mine("shop/index.html", GUARD)).toBe(true);
    expect(mine("cdn/reel.js", GUARD)).toBe(false);
    expect(mine("stats/stats.json", GUARD)).toBe(false);
    expect(mine("stats/index.html", GUARD)).toBe(true);
  });

  test("a sweep strips the prefix and never descends into a guarded folder", async () => {
    expect(await sweep(fake, "site/", GUARD)).toEqual(["index.html", "shop/index.html", "ui/tokens-8a0bcf6d.css"]);
  });

  test("a sweep at the bucket root walks from the empty prefix", async () => {
    const flat: Lister = { list: async ({ prefix }) => (prefix === "" ? page(["index.html"], ["cdn/"]) : page([], [])) };
    expect(await sweep(flat, "", ["cdn/"])).toEqual(["index.html"]);
  });
});
