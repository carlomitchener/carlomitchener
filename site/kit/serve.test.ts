import { expect, test } from "bun:test";
import type { Output, Route, Site, Spec } from "./ssg/build.ts";
import { find, serve } from "./serve.ts";

/* SITE */

const routes: Route[] = [
  { route: "/", name: "Home" },
  { route: "/about/", kind: "page", name: "About" },
  { route: "/papers/one/", kind: "paper", name: "One" },
  { route: "/blog/hello/@files", kind: "files", hidden: true, urls: [{ route: "/blog/hello/hero.png" }] },
  { route: "/404.html", kind: "missing", hidden: true },
];

const drawn: Record<string, Output[]> = {
  "/": [{ path: "index.html", bytes: "<h1>home</h1>" }],
  "/about/": [
    { path: "about/index.html", bytes: "<h1>about</h1>" },
    { path: "about/data.json", bytes: '{"ok":true}', type: "application/json" },
  ],
  "/papers/one/": [
    { path: "papers/one/index.html", bytes: "<h1>one</h1>" },
    { path: "papers/one/paper.tex", bytes: "\\documentclass{article}" },
  ],
  "/blog/hello/@files": [{ path: "blog/hello/hero.png", bytes: new Uint8Array([137, 80, 78, 71]), type: "image/png" }],
  "/404.html": [{ path: "404.html", bytes: "<h1>lost</h1>" }],
};

const spec = { render: (_: Site, route: Route) => drawn[route.route] ?? [] } as unknown as Spec;

const site = {
  config: { root: "https://demo.test" },
  routes,
  copies: [{ path: "ui/base-abcd1234.css", bytes: "body{margin:0}" }],
} as unknown as Site;

/* TESTS */

test("a path answers the route's output with the type it carries", async () => {
  const hit = await serve(spec, site, "/about/data.json");
  expect(hit.status).toBe(200);
  expect(hit.headers.get("content-type")).toBe("application/json");
  expect(await hit.text()).toBe('{"ok":true}');
});

test("a slash route answers its index.html as html", async () => {
  const hit = await serve(spec, site, "/");
  expect(hit.headers.get("content-type")).toBe("text/html; charset=utf-8");
  expect(await hit.text()).toBe("<h1>home</h1>");
});

test("a route that lists what it publishes answers a listed path", async () => {
  const hit = await serve(spec, site, "/blog/hello/hero.png");
  expect(hit.status).toBe(200);
  expect(hit.headers.get("content-type")).toBe("image/png");
});

test("a slash route holds the files it writes beside its page", async () => {
  const hit = await serve(spec, site, "/papers/one/paper.tex");
  expect(hit.headers.get("content-type")).toBe("text/plain; charset=utf-8");
  expect(await hit.text()).toContain("documentclass");
});

test("a placed copy answers from the globals", async () => {
  const hit = await serve(spec, site, "/ui/base-abcd1234.css");
  expect(hit.headers.get("content-type")).toBe("text/css; charset=utf-8");
});

test("a route without its slash redirects to it", async () => {
  const hit = await serve(spec, site, "/about");
  expect(hit.status).toBe(302);
  expect(hit.headers.get("location")).toBe("/about/");
});

test("an unknown path is the 404 page", async () => {
  const hit = await serve(spec, site, "/nowhere/");
  expect(hit.status).toBe(404);
  expect(await hit.text()).toBe("<h1>lost</h1>");
});

test("a traversal path is a miss and a 404", async () => {
  expect(await find(spec, site, "/ui/../../site.json")).toBeNull();
  expect(await find(spec, site, "/../site.json")).toBeNull();
  expect(await find(spec, site, "/about/./index.html")).toBeNull();
  expect((await serve(spec, site, "/../site.json")).status).toBe(404);
});
