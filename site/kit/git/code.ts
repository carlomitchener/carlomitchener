import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import type { HighlighterCore } from "@shikijs/core";
import { escape } from "../ssg/build.ts";

/* GRAMMARS */

const GRAMMARS: Record<string, () => Promise<unknown>> = {
  c: () => import("@shikijs/langs/c"),
  css: () => import("@shikijs/langs/css"),
  csv: () => import("@shikijs/langs/csv"),
  html: () => import("@shikijs/langs/html"),
  javascript: () => import("@shikijs/langs/javascript"),
  json: () => import("@shikijs/langs/json"),
  jsx: () => import("@shikijs/langs/jsx"),
  markdown: () => import("@shikijs/langs/markdown"),
  python: () => import("@shikijs/langs/python"),
  rust: () => import("@shikijs/langs/rust"),
  shellscript: () => import("@shikijs/langs/shellscript"),
  toml: () => import("@shikijs/langs/toml"),
  tsx: () => import("@shikijs/langs/tsx"),
  typescript: () => import("@shikijs/langs/typescript"),
  wgsl: () => import("@shikijs/langs/wgsl"),
  yaml: () => import("@shikijs/langs/yaml"),
};

/* VERSION */

const here = createRequire(import.meta.url);

function installed(): string {
  try {
    return JSON.parse(readFileSync(here.resolve("@shikijs/core/package.json"), "utf8")).version;
  } catch {
    return "";
  }
}

export const version: string = installed();

/* CORE */

const NAME = "kit";

let held: Promise<HighlighterCore> | undefined;

const loaded = new Map<string, Promise<boolean>>();

async function boot(): Promise<HighlighterCore> {
  const [{ createCssVariablesTheme, createHighlighterCore }, { createJavaScriptRegexEngine }] = await Promise.all([import("@shikijs/core"), import("@shikijs/engine-javascript")]);
  return createHighlighterCore({
    langs: [],
    themes: [createCssVariablesTheme({ name: NAME, variablePrefix: "--code-" })],
    engine: createJavaScriptRegexEngine({ forgiving: true }),
  });
}

function core(): Promise<HighlighterCore> {
  held ??= boot();
  return held;
}

function ready(name: string): Promise<boolean> {
  let job = loaded.get(name);
  if (!job) {
    job = core()
      .then(async (one) => {
        await one.loadLanguage((await GRAMMARS[name]!()) as never);
        return true;
      })
      .catch(() => false);
    loaded.set(name, job);
  }
  return job;
}

/* CLASSES */

const TOKEN = /^var\(--code-token-([a-z-]+)\)$/;

const ITALIC = 1;

const BOLD = 2;

const UNDER = 4;

function span(content: string, color: string | undefined, face: number): string {
  const body = escape(content);
  const cls: string[] = [];
  const hit = color ? TOKEN.exec(color) : null;
  if (hit) cls.push(`tk-${hit[1]}`);
  if (face & ITALIC) cls.push("tk-italic");
  if (face & BOLD) cls.push("tk-bold");
  if (face & UNDER) cls.push("tk-underline");
  return cls.length ? `<span class="${cls.join(" ")}">${body}</span>` : body;
}

/* PAINT */

export async function paint(text: string, kind: string): Promise<string[] | null> {
  if (!GRAMMARS[kind]) return null;
  if (!(await ready(kind))) return null;
  const body = text.replace(/\r\n?/g, "\n").replace(/\n$/, "");
  try {
    const { tokens } = (await core()).codeToTokens(body, { lang: kind, theme: NAME });
    return tokens.map((line) => line.map((one) => span(one.content, one.color, one.fontStyle ?? 0)).join(""));
  } catch {
    return null;
  }
}
