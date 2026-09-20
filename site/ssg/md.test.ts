import { describe, expect, test } from "bun:test";
import { front, inline, render, sheet, slug } from "./md.ts";

const math = (tex: string, display: boolean) => `<m${display ? " d" : ""}>${tex}</m>`;

const link = (url: string) => (/^(https?:|#|\/)/.test(url) ? url : `/L/${url}`);

describe("md", () => {
  test("headings carry the slug of their text and repeat with a counter", () => {
    const html = render("## Base $\\pi$ and *em*\n\n## Base $\\pi$ and *em*", { math });
    expect(html).toContain(`<h2 id="${slug("base π and em")}">`);
    expect(html).toContain(`<h2 id="${slug("base π and em")}-1">`);
  });

  test("a lone image line is a figure with an inline caption, an inline image stays an image", () => {
    expect(render("![the *walk*](walks-fig)", { link })).toBe('<figure><img src="/L/walks-fig" alt="the walk"><figcaption>the <em>walk</em></figcaption></figure>');
    expect(render("see ![walk](walks-fig) here", { link })).toBe('<p>see <img src="/L/walks-fig" alt="walk"> here</p>');
  });

  test("the widget line mounts a view through the hook and is a figure without one", () => {
    const widget = (name: string, view: string, caption: string) => `<w ${name} ${view}>${caption}</w>`;
    expect(render("![Life](demos/life/grid)", { widget })).toBe("<w life grid>Life</w>");
    expect(render("![Life](demos/life/grid)", { link })).toContain('<img src="/L/demos/life/grid"');
  });

  test("math is inline at $, display at $$ on its own line or block, with escaped braces unescaped", () => {
    expect(render("$a<b$ and $$x^2$$", { math })).toBe("<p><m>a<b</m> and <m>x^2</m></p>");
    expect(render("$$x^2$$", { math })).toBe("<m d>x^2</m>");
    expect(render("$$\ny\n$$", { math })).toBe("<m d>y</m>");
    expect(render("$F = \\\\{0\\\\}$", { math })).toBe("<p><m>F = \\{0\\}</m></p>");
    expect(render("$5 and $10")).toBe("<p>$5 and $10</p>");
  });

  test("a table is wrapped, aligned by class and one row per line", () => {
    const html = render("| a | b | c |\n|:--|:-:|--:|\n| 1 | 2 | 3 |");
    expect(html).toBe('<div class="table"><table><thead><tr><th>a</th><th class="center">b</th><th class="right">c</th></tr></thead><tbody>\n<tr><td>1</td><td class="center">2</td><td class="right">3</td></tr>\n</tbody></table></div>');
  });

  test("an asterisk between two word characters is literal, around words it is emphasis, in code it is untouched", () => {
    expect(render("3*n*(n+1) and *\"2*20^n + 4*8^n\"* and `a*b*c`")).toBe('<p>3*n*(n+1) and <em>"2*20^n + 4*8^n"</em> and <code>a*b*c</code></p>');
  });

  test("every link and bare url goes through the resolver", () => {
    expect(render("[a](x.md) and https://oeis.org/A1", { link })).toBe('<p><a href="/L/x.md">a</a> and <a href="https://oeis.org/A1">https://oeis.org/A1</a></p>');
  });

  test("raw html is shown as text", () => {
    expect(render("n<m and <b>x</b>")).toBe("<p>n&lt;m and &lt;b>x&lt;/b></p>");
  });

  test("lists are tight, so a dated claim line starts its item", () => {
    expect(render("- 2026-09-19 [Proved] one\n- two\n\n1. a\n2. b")).toBe("<ul>\n<li>2026-09-19 [Proved] one</li>\n<li>two</li>\n</ul>\n<ol>\n<li>a</li>\n<li>b</li>\n</ol>");
  });

  test("inline drops the paragraph", () => {
    expect(inline("a **b** [c](d)", { link })).toBe('a <strong>b</strong> <a href="/L/d">c</a>');
  });

  test("sheet splits the title, the lead and the body", () => {
    const doc = sheet("# Hi *there*\n\nLead with [a](b).\n\n## Next\n\n- x", link);
    expect(doc).toEqual({ title: "Hi there", lead: 'Lead with <a href="/L/b">a</a>.', text: "Lead with a.", body: '<h2 id="next">Next</h2>\n<ul>\n<li>x</li>\n</ul>' });
    expect(sheet("Just prose.").title).toBe("");
  });

  test("front matter is key colon value lines", () => {
    expect(front("---\ntitle: T\nlead: L\n---\nbody")).toEqual({ data: { title: "T", lead: "L" }, body: "body" });
    expect(front("body").data).toEqual({});
  });
});
