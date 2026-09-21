import { expect, test } from "bun:test";
import { index, resolve, stamp } from "./links.ts";
import type { Input, Route, Site } from "./build.ts";

/* SITE */

const home = "/repo";
const net = `${home}/site`;

const input = (name: string, path: string): Input => ({ name, path, files: [], missing: false });

const routes: Route[] = [
  { route: "/research/", kind: "research", source: `${home}/research/README.md` },
  { route: "/research/bases/", kind: "note", source: `${home}/research/bases.md` },
  { route: "/blog/hello/", kind: "post", source: `${net}/blog/hello.md` },
  { route: "/about/", kind: "page", source: `${net}/pages/about.md` },
  { route: "/contact/", kind: "page", source: `${net}/pages/contact.md` },
  {
    route: "/demos/",
    kind: "demos",
    source: `${net}/demos`,
    urls: [{ route: "/demos/spin/", source: `${net}/demos/spin` }],
  },
];

const code: Route[] = [
  { route: "/git/", kind: "gitdir" },
  { route: "/git/crates/mrly/", kind: "gitdir" },
  { route: "/git/crates/mrly/README.md", kind: "gitfile" },
  { route: "/git/research/lab/walk.rs", kind: "gitfile" },
  { route: "/git/files/figures/carpet.png", kind: "gitfile" },
];

function site(git: boolean): Site {
  const one = {
    root: net,
    config: { git: git ? { root: "..", slug: "mrlyprod/mrlyprod", branch: "main" } : { root: ".", slug: "acme/site" } },
    inputs: {
      research: input("research", `${home}/research`),
      blog: input("blog", `${net}/blog`),
      pages: input("pages", `${net}/pages`),
      demos: input("demos", `${net}/demos`),
    },
    routes: git ? [...routes, ...code] : routes,
  } as unknown as Site;
  one.index = index(one);
  return one;
}

const mrly = site(true);

/* ROUTES */

test("a note link to a sibling note lands on that note's route", () => {
  expect(resolve(mrly, "research/core.md", "bases.md")).toBe("/research/bases/");
  expect(resolve(mrly, "research/core.md", "README.md")).toBe("/research/");
});

test("a note link to a demo lands on the demo route", () => {
  expect(resolve(mrly, "research/core.md", "../demos/spin/")).toBe("/demos/spin/");
});

test("a page link to a page lands on that page's route", () => {
  expect(resolve(mrly, "site/pages/about.md", "contact.md")).toBe("/contact/");
});

test("a post link to a note lands on the research route", () => {
  expect(resolve(mrly, "site/blog/hello.md", "../../research/bases.md")).toBe("/research/bases/");
});

test("a fragment and a query ride along", () => {
  expect(resolve(mrly, "research/core.md", "bases.md#lemma")).toBe("/research/bases/#lemma");
  expect(resolve(mrly, "research/core.md", "../demos/spin/?code=7")).toBe("/demos/spin/?code=7");
});

/* STAMP */

test("the stamp moves when a route a page could link to disappears", () => {
  const gone = { ...mrly, routes: mrly.routes.filter((one) => one.route !== "/research/bases/") } as Site;
  expect(stamp(index(gone))).not.toBe(stamp(mrly.index!));
});

test("a source outside the repo never lands in the stamp", () => {
  const away = "/shelf/carpet/README.md";
  const wide = { ...mrly, routes: [...mrly.routes, { route: "/shelf/carpet/", kind: "note", source: away }] } as Site;
  expect(stamp(index(wide))).not.toContain(away);
});

/* FALLBACK */

test("a repo file with no route lands on its /git/ page", () => {
  expect(resolve(mrly, "research/core.md", "lab/walk.rs")).toBe("/git/research/lab/walk.rs");
  expect(resolve(mrly, "research/core.md", "../crates/mrly/README.md")).toBe("/git/crates/mrly/README.md");
});

test("an image with no route lands on its raw bytes", () => {
  expect(resolve(mrly, "research/core.md", "../files/figures/carpet.png")).toBe("/raw/files/figures/carpet.png");
});

test("an extensionless directory lands on its listing", () => {
  expect(resolve(mrly, "research/core.md", "../crates/mrly")).toBe("/git/crates/mrly/");
});

test("a path the repo does not carry stays as written", () => {
  expect(resolve(mrly, "research/core.md", "lab/gone.rs")).toBe("lab/gone.rs");
  expect(resolve(mrly, "../shelf/carpet/README.md", "paper.pdf")).toBe("paper.pdf");
});

test("a site with no git routes falls to the github blob", () => {
  expect(resolve(site(false), "pages/about.md", "../tools/tree.js")).toBe("https://github.com/acme/site/blob/main/tools/tree.js");
});

test("a script-bearing scheme never survives as a link", () => {
  for (const url of ["javascript:alert(1)", "JavaScript:alert(1)", " java\tscript:alert(1)", "data:text/html,<script>alert(1)</script>"]) {
    expect(resolve(mrly, "research/core.md", url)).toBe("#");
  }
});

test("an outside link and a rooted link pass through", () => {
  for (const url of ["https://mrly.net", "http://mrly.net", "mailto:help@mrly.net", "tel:+1", "#top", "/demos/"]) {
    expect(resolve(mrly, "research/core.md", url)).toBe(url);
  }
});

/* NO GIT */

const shop = (() => {
  const one = {
    root: net,
    config: {},
    inputs: { pages: input("pages", `${net}/pages`), readme: input("readme", `${home}/README.md`) },
    routes: [{ route: "/about/", kind: "page", source: `${home}/README.md` }, ...routes.filter((one) => one.kind === "page")],
  } as unknown as Site;
  one.index = index(one);
  return one;
})();

test("a declared input outside the site root lands on its route", () => {
  expect(resolve(shop, "pages/about.md", "../../README.md")).toBe("/about/");
});

test("a site with no git block and no slug leaves a miss as written", () => {
  expect(resolve(shop, "pages/about.md", "privacy.md")).toBe("privacy.md");
});
