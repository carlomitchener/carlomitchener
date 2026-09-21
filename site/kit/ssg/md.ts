import type { Element, Root as Hast, RootContent as HastContent } from "hast";
import type { Heading, Nodes, Paragraph, Root } from "mdast";
import rehypeStringify from "rehype-stringify";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import { unified } from "unified";
import { visit } from "unist-util-visit";

/* TYPES */

export type Link = (url: string) => string;

export type Options = {
  link?: Link;
  math?: (tex: string, display: boolean) => string;
  widget?: (name: string, view: string, caption: string) => string;
};

type Raw = { type: "raw"; value: string };

/* TEXT */

const ESC: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" };

export const escape = (text: unknown) => String(text).replace(/[&<>"]/g, (c) => ESC[c]!);

export const slug = (text: string) => text.toLowerCase().replace(/[^\p{L}\p{N} _-]/gu, "").replace(/ /g, "-");

const TEX: Record<string, string> = { lceil: "⌈", rceil: "⌉", lfloor: "⌊", rfloor: "⌋", ne: "≠", neq: "≠", le: "≤", leq: "≤", ge: "≥", geq: "≥", times: "×", infty: "∞", pi: "π", cdot: "·", to: "→", left: "", right: "" };

export function plain(text: string): string {
  return text
    .replace(/\\([a-zA-Z]+)\s?/g, (m, name: string) => (name in TEX ? TEX[name]! : m))
    .replace(/\s+([⌉⌋])/g, "$1")
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/`([^`]*)`/g, "$1")
    .replace(/\*\*([^*]*)\*\*/g, "$1")
    .replace(/\*([^*]*)\*/g, "$1")
    .replace(/\$\$?([^$]*)\$\$?/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

export function title(md: string): string {
  const m = md.match(/^# (.+)$/m);
  return m ? plain(m[1]!) : "";
}

export function summary(md: string, max = 200): string {
  const skip = /^(#{1,6} |```|\$\$|\||!\[)/;
  const line = md.split("\n").find((l) => l.trim() && !skip.test(l)) ?? "";
  const text = plain(line.replace(/^(- |\d+\. |> )/, ""));
  if (text.length <= max) return text;
  const cut = text.lastIndexOf(" ", max);
  return text.slice(0, cut > 0 ? cut : max);
}

export function front(md: string): { data: Record<string, string>; body: string } {
  const m = md.match(/^---\n([\s\S]*?)\n---\n?/);
  if (!m) return { data: {}, body: md };
  const data: Record<string, string> = {};
  for (const line of m[1]!.split("\n")) {
    const at = line.indexOf(":");
    if (at > 0) data[line.slice(0, at).trim()] = line.slice(at + 1).trim();
  }
  return { data, body: md.slice(m[0].length) };
}

/* SHAPE */

const WORD = /[\p{L}\p{N}]/u;

const PROTECTED = new Set(["code", "inlineCode", "math", "inlineMath", "html"]);

const unescape = (tex: string) => tex.replace(/\\\\([!-\/:-@[-`{-~])/g, "\\$1");

function literal(src: string, tree: Root): string {
  const keep: [number, number][] = [];
  visit(tree, (node) => {
    if (PROTECTED.has(node.type)) keep.push([node.position!.start.offset!, node.position!.end.offset!]);
  });
  keep.sort((a, b) => a[0] - b[0]);
  let out = "";
  let at = 0;
  const prose = (from: number, to: number) => {
    for (let i = from; i < to; i++) out += src[i] === "*" && WORD.test(src[i - 1] ?? "") && WORD.test(src[i + 1] ?? "") ? "\\*" : src[i]!;
  };
  for (const [from, to] of keep) {
    if (from < at) continue;
    prose(at, from);
    out += src.slice(from, to);
    at = to;
  }
  prose(at, src.length);
  return out;
}

const FIGURE = /^!\[([^\]]*)\]\(([^)]*)\)$/;

const WIDGET = /^!\[([^\]]*)\]\(demos\/([a-z0-9-]+)\/([a-z0-9-]+)\)$/;

const source = (src: string, node: Nodes) => src.slice(node.position!.start.offset, node.position!.end.offset);

const headingText = (src: string, node: Heading) =>
  source(src, node).replace(/^#{1,6}[ \t]+/, "").replace(/[ \t]+#+[ \t]*$/, "").replace(/\n[ \t]*[=-]+[ \t]*$/, "").trim();

function figure(src: string, node: Paragraph, opts: Options): Raw | null {
  if (node.children.length !== 1 || node.children[0]!.type !== "image") return null;
  const text = source(src, node);
  const widget = opts.widget && text.match(WIDGET);
  if (widget) return { type: "raw", value: opts.widget!(widget[2]!, widget[3]!, inline(widget[1]!, opts)) };
  const image = text.match(FIGURE);
  if (!image) return null;
  const href = (opts.link ?? ((u) => u))(image[2]!.trim());
  const alt = (node.children[0] as { alt?: string }).alt ?? "";
  return { type: "raw", value: `<figure><img src="${escape(href)}" alt="${escape(alt)}"><figcaption>${inline(image[1]!, opts)}</figcaption></figure>` };
}

function shape(src: string, opts: Options) {
  return (tree: Root) => {
    const ids = new Map<string, number>();
    visit(tree, (node, index, parent) => {
      if (node.type === "heading") {
        const base = slug(plain(headingText(src, node)));
        const seen = ids.get(base) ?? 0;
        ids.set(base, seen + 1);
        node.data = { ...node.data, hProperties: { id: seen ? `${base}-${seen}` : base } };
      } else if (node.type === "list") node.spread = false;
      else if (node.type === "listItem") node.spread = false;
      else if ((node.type === "link" || node.type === "image" || node.type === "definition") && opts.link) node.url = opts.link(node.url);
      else if (node.type === "paragraph" && parent && index !== undefined) {
        const only = node.children.length === 1 ? node.children[0]! : null;
        if (only && only.type === "inlineMath" && source(src, node).startsWith("$$")) {
          parent.children[index] = { type: "math", value: only.value };
          return;
        }
        const raw = figure(src, node, opts);
        if (raw) parent.children[index] = raw as never;
      }
    });
  };
}

/* TABLES */

const blank = (node: HastContent) => node.type === "text" && !node.value.trim();

function tables() {
  return (tree: Hast) => {
    visit(tree, "element", (node: Element, index, parent) => {
      if (node.tagName === "th" || node.tagName === "td") {
        const align = node.properties.align;
        delete node.properties.align;
        if (align === "center" || align === "right") node.properties.className = [align];
      } else if (node.tagName === "tr" || node.tagName === "thead") node.children = node.children.filter((kid) => !blank(kid));
      else if (node.tagName === "table" && parent && index !== undefined) {
        node.children = node.children.filter((kid) => !blank(kid));
        parent.children[index] = { type: "element", tagName: "div", properties: { className: ["table"] }, children: [node] };
      }
    });
  };
}

/* RENDER */

const code = (tex: string) => `<code>${escape(tex)}</code>`;

function parser(opts: Options) {
  const chain = unified().use(remarkParse).use(remarkGfm);
  return opts.math ? chain.use(remarkMath) : chain;
}

export function render(md: string, opts: Options = {}): string {
  const raw = md.replace(/\r\n?/g, "\n");
  const src = literal(raw, parser(opts).parse(raw));
  const math = opts.math ?? code;
  const handlers = {
    math: (_: unknown, node: { value: string }) => ({ type: "raw", value: math(unescape(node.value), true) }),
    inlineMath: (_: unknown, node: { value: string }) => ({ type: "raw", value: math(unescape(node.value), false) }),
    html: (_: unknown, node: { value: string }) => ({ type: "text", value: node.value }),
    raw: (_: unknown, node: { value: string }) => ({ type: "raw", value: node.value }),
  };
  const out = parser(opts)
    .use(shape, src, opts)
    .use(remarkRehype, { allowDangerousHtml: true, handlers: handlers as never })
    .use(tables)
    .use(rehypeStringify, { allowDangerousHtml: true, characterReferences: { useNamedReferences: true } })
    .processSync(src);
  return String(out).replace(/\n$/, "");
}

export function inline(text: string, opts: Options = {}): string {
  const html = render(text, opts);
  const m = html.match(/^<p>([\s\S]*)<\/p>$/);
  return m ? m[1]! : html;
}

/* SHEET */

export function sheet(md: string, link?: Link) {
  const src = md.replace(/\r\n?/g, "\n");
  const tree = parser({}).parse(src);
  const [first, second] = tree.children;
  const head = first && first.type === "heading" && first.depth === 1 ? first : null;
  const para = head && second && second.type === "paragraph" ? second : null;
  const lead = para ? source(src, para) : "";
  const from = para ? para.position!.end.offset! : head ? head.position!.end.offset! : 0;
  return {
    title: head ? plain(headingText(src, head)) : "",
    lead: lead ? inline(lead, { link }) : "",
    text: plain(lead),
    body: render(src.slice(from), { link }),
  };
}
