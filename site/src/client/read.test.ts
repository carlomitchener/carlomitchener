import { expect, test } from "bun:test";
import { read } from "./read.ts";

/* PAGE */

const BODY = `<div class="code d2"><pre><code><span class="line"><span class="t">&lt;div data-body&gt;</span></span></code></pre></div>`;

const BOX = `{"page":{"kind":"code","title":"read.ts","props":{"body":""}},"chrome":{"route":"/git/site/read.ts","catalog":[],"fly":false,"now":1790017200000}}`;

const HTML = `<!doctype html>\n<html lang="en"><head><title>read.ts</title></head><body><a class="skip" href="#main">Skip to content</a><div id="app"><main id="main"><div class="wrap"><div id="code" class="git" data-body>${BODY}</div></div></main></div><script id="props" type="application/json">${BOX}</script><script type="module" src="/js/main-a.js"></script></body></html>\n`;

/* READ */

test("the reader takes the props box off a served page and fills the body from its data-body element", () => {
  const view = read(HTML);
  expect(view?.page.kind).toBe("code");
  expect(view?.chrome.route).toBe("/git/site/read.ts");
  expect(view?.page.props.body).toBe(BODY);
});

test("a served page with no props box reads as nothing, so the router falls back to a full load", () => {
  expect(read(HTML.replace(/<script id="props"[\s\S]*?<\/script>/, ""))).toBeNull();
});
