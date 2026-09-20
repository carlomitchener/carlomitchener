import { expect, test } from "bun:test";
import { index, resolve, stamp } from "./links.ts";
import type { Input, Route, Site } from "./build.ts";

/* SITE */

const home = "/repo/site";

const input = (name: string, path: string): Input => ({ name, path, files: [], missing: false });

const routes: Route[] = [
  { route: "/about/", kind: "page", source: "/repo/README.md" },
  { route: "/contact/", kind: "page", source: `${home}/pages/contact.md` },
  { route: "/shop/faq/", kind: "page", source: `${home}/pages/faq.md` },
  { route: "/shop/terms/", kind: "page", source: `${home}/pages/terms.md` },
];

function shop(): Site {
  const one = {
    root: home,
    config: {},
    inputs: {
      pages: input("pages", `${home}/pages`),
      readme: input("readme", "/repo/README.md"),
    },
    routes,
  } as unknown as Site;
  one.index = index(one);
  return one;
}

const site = shop();

/* ROUTES */

test("a page link to a sibling page lands on that page's route", () => {
  expect(resolve(site, "pages/contact.md", "faq.md")).toBe("/shop/faq/");
  expect(resolve(site, "pages/terms.md", "privacy.md")).toBe("privacy.md");
});

test("a link to the readme outside the site lands on the about route", () => {
  expect(resolve(site, "pages/contact.md", "../../README.md")).toBe("/about/");
});

test("a fragment and a query ride along", () => {
  expect(resolve(site, "pages/contact.md", "faq.md#returns")).toBe("/shop/faq/#returns");
  expect(resolve(site, "pages/contact.md", "terms.md?read=1")).toBe("/shop/terms/?read=1");
});

test("a script-bearing scheme never survives as a link", () => {
  for (const url of ["javascript:alert(1)", "JavaScript:alert(1)", " java\tscript:alert(1)", "data:text/html,<script>alert(1)</script>"]) {
    expect(resolve(site, "pages/contact.md", url)).toBe("#");
  }
});

test("an outside link and a rooted link pass through", () => {
  for (const url of ["https://mrly.net", "http://mrly.net", "mailto:carlo@mrly.net", "tel:+1", "#top", "/shop/"]) {
    expect(resolve(site, "pages/contact.md", url)).toBe(url);
  }
});

/* STAMP */

test("the stamp moves when a route a page could link to disappears", () => {
  const gone = { ...site, routes: routes.filter((one) => one.route !== "/shop/faq/") } as Site;
  expect(stamp(index(gone))).not.toBe(stamp(site.index!));
});

test("a source outside the site never lands in the stamp", () => {
  expect(stamp(site.index!)).not.toContain("/repo/README.md");
});
