import { expect, test } from "bun:test";
import { decide, handle, moves } from "./edge.ts";
import { HEADERS, POLICY } from "./build.ts";
import { NET_HEADERS } from "./ship.ts";

const MOVED = moves({
  "/math/": { to: "/mrlymath/" },
  "/julia/": { to: "/fractals/?kind=julia" },
});

const seen: string[] = [];

const ASSETS = {
  fetch: async (request: Request) => {
    const url = new URL(request.url);
    seen.push(url.pathname + url.search);
    const type = url.pathname.endsWith(".png") ? "image/png" : url.pathname.endsWith(".html") ? "text/html" : "application/octet-stream";
    return new Response("x", { headers: { "content-type": type } });
  },
};

const ask = (path: string, host = "example.com") => handle(new Request(`https://${host}${path}`), { ASSETS }, MOVED);

const where = async (path: string, host?: string) => {
  const out = await ask(path, host);
  expect(out.status).toBe(301);
  return out.headers.get("location");
};

const pass = (uri: string) => expect(decide(uri, MOVED)).toEqual({ uri });
const shell = (uri: string) => expect(decide(uri, MOVED)).toEqual({ uri: "/index.html" });

test("the root answers the shell", () => shell("/"));

test("a bare segment 301s to its slash form", () => {
  expect(decide("/x", MOVED)).toEqual({ redirect: "/x/" });
});

test("a slash form answers the shell", () => shell("/x/"));

test("the 301 keeps the query string", async () => {
  expect(await where("/x?seed=1")).toBe("/x/?seed=1");
});

test("a move that carries a query joins the asked query after it", async () => {
  expect([await where("/julia/"), await where("/julia/?seed=1")]).toEqual(["/fractals/?kind=julia", "/fractals/?kind=julia&seed=1"]);
});

test("the 301 keeps a repeated key", async () => {
  expect(await where("/x?a=1&a=2")).toBe("/x/?a=1&a=2");
});

test("a rewrite asks the assets for the shell and keeps the query", async () => {
  seen.length = 0;
  await ask("/x/?seed=1");
  expect(seen).toEqual(["/index.html?seed=1"]);
});

test("raw files pass with or without a dot", () => {
  pass("/raw/LICENSE");
  pass("/raw/a.md");
});

test("raw files are text unless passive", async () => {
  expect([
    (await ask("/raw/LICENSE")).headers.get("content-type"),
    (await ask("/raw/a.html")).headers.get("content-type"),
    (await ask("/raw/a.png")).headers.get("content-type"),
  ]).toEqual(["text/plain; charset=utf-8", "text/plain; charset=utf-8", "image/png"]);
});

test("a git path answers the shell", () => shell("/git/a/b.ts"));

test("the git root answers the shell", () => shell("/git/"));

test("git.json is a file", () => pass("/git.json"));

test("the shell itself passes", () => pass("/index.html"));

test("root text files pass", () => {
  pass("/robots.txt");
  pass("/sitemap-raw.xml");
  pass("/llms.txt");
});

test("a paper pdf passes", () => pass("/a/paper.pdf"));

test("an old page file passes to the asset miss", () => pass("/x/index.html"));

test("a moved key 301s to its target", () => {
  expect(decide("/math/", MOVED)).toEqual({ redirect: "/mrlymath/" });
});

test("a moved key without the slash 301s to its target", () => {
  expect(decide("/math", MOVED)).toEqual({ redirect: "/mrlymath/" });
});

test("www 301s to the apex with the path and query", async () => {
  expect(await where("/blog/?a=b", "www.example.com")).toBe("https://example.com/blog/?a=b");
});

test("the net headers are today's with the CSP widened for wasm and fonts", () => {
  const csp = NET_HEADERS["Content-Security-Policy"]!.split("; ");
  expect({ ...NET_HEADERS, "Content-Security-Policy": "" }).toEqual({ ...HEADERS, "Content-Security-Policy": "" });
  expect(csp.filter((rule) => !POLICY.includes(rule)).sort()).toEqual(["font-src 'self' data:", "script-src 'self' 'wasm-unsafe-eval'"]);
  expect(POLICY.filter((rule) => !csp.includes(rule))).toEqual(["script-src 'self'"]);
});
