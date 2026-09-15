const escape = (text: string) =>
  text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/* INLINE */

const marks = (html: string) =>
  html
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>")
    .replace(/`([^`]+)`/g, "<code>$1</code>");

export type Href = (url: string) => string;

export function inline(text: string, href?: Href): string {
  let out = "";
  let at = 0;
  for (const hit of text.matchAll(/\[([^\]]+)\]\(([^)]+)\)/g)) {
    out += escape(text.slice(at, hit.index)) + `<a href="${escape(href ? href(hit[2]) : hit[2])}">${escape(hit[1])}</a>`;
    at = hit.index! + hit[0].length;
  }
  return marks(out + escape(text.slice(at)));
}

/* TABLE */

const cells = (row: string) => row.trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map((one) => one.trim());

const ruler = (row: string) => /^\s*\|?[\s:|-]*-[\s:|-]*\|?\s*$/.test(row) && row.includes("-");

const row = (line: string, tag: string, href?: Href) =>
  `<tr>${cells(line).map((cell) => `<${tag}>${inline(cell, href)}</${tag}>`).join("")}</tr>`;

/* BLOCKS */

const HEAD = /^(#{1,6})\s+(.*)$/;

const ITEM = /^\s*[-*]\s+(.*)$/;

const opens = (line: string) => !line.trim() || line.startsWith("```") || HEAD.test(line) || ITEM.test(line) || line.trim().startsWith("|");

export function markdown(text: string, href?: Href): string {
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const out: string[] = [];
  let at = 0;
  while (at < lines.length) {
    const line = lines[at];
    if (!line.trim()) {
      at++;
      continue;
    }
    if (line.startsWith("```")) {
      const lang = line.slice(3).trim();
      const body: string[] = [];
      at++;
      while (at < lines.length && !lines[at].startsWith("```")) body.push(lines[at++]);
      at++;
      out.push(`<pre><code${lang ? ` class="lang-${lang}"` : ""}>${escape(body.join("\n"))}\n</code></pre>`);
      continue;
    }
    const head = line.match(HEAD);
    if (head) {
      const n = head[1].length;
      out.push(`<h${n}>${inline(head[2], href)}</h${n}>`);
      at++;
      continue;
    }
    if (ITEM.test(line)) {
      const items: string[] = [];
      while (at < lines.length && ITEM.test(lines[at])) items.push(`<li>${inline(lines[at++].match(ITEM)![1], href)}</li>`);
      out.push(`<ul>${items.join("")}</ul>`);
      continue;
    }
    if (line.trim().startsWith("|") && at + 1 < lines.length && ruler(lines[at + 1])) {
      const head_ = row(lines[at], "th", href);
      at += 2;
      const body: string[] = [];
      while (at < lines.length && lines[at].trim().startsWith("|")) body.push(row(lines[at++], "td", href));
      out.push(`<table><thead>${head_}</thead><tbody>${body.join("")}</tbody></table>`);
      continue;
    }
    const para: string[] = [lines[at++]];
    while (at < lines.length && !opens(lines[at])) para.push(lines[at++]);
    out.push(`<p>${inline(para.join(" ").trim(), href)}</p>`);
  }
  return out.join("\n");
}

/* SHEET */

export const plain = (text: string) => text.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1").replace(/[*`]/g, "").trim();

export function sheet(text: string, href?: Href) {
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  let title = "";
  let at = 0;
  while (at < lines.length && !lines[at].trim()) at++;
  const head = at < lines.length ? lines[at].match(/^#\s+(.*)$/) : null;
  if (head) {
    title = head[1].trim();
    at++;
  }
  const rest = lines.slice(at);
  let lead = "";
  let from = 0;
  while (from < rest.length && !rest[from].trim()) from++;
  if (from < rest.length && !opens(rest[from])) {
    const para: string[] = [];
    while (from < rest.length && !opens(rest[from])) para.push(rest[from++]);
    lead = para.join(" ").trim();
  }
  return { title, lead: lead ? inline(lead, href) : "", text: plain(lead), body: markdown(rest.slice(from).join("\n"), href) };
}
