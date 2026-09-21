import { expect, test } from "bun:test";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { walk } from "../kit/ssg/build.ts";
import { pages } from "./build.ts";

/* SELECTORS */

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

/* CSS */

test("the site css never repeats a top-level selector with another rule between", () => {
  const home = join(import.meta.dir, "..", "ui");
  for (const name of readdirSync(home).filter((one) => one.endsWith(".css")).sort()) {
    const file = join(home, name);
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

/* ROUTES */

test("the status page is gone and the automator and the stats pages stand in its place", async () => {
  const done = await pages();
  const routes = done.site.routes.map((one) => one.route);
  expect(routes).toContain("/automator/");
  expect(routes).toContain("/stats/");
  expect(routes).not.toContain("/status/");
}, 120000);
