import type { Topic } from "./topics.ts";

export type Carded = Pick<Topic, "slug" | "title" | "figure">;

export type Shelved = Pick<Topic, "title" | "date"> & Partial<Pick<Topic, "lead">>;

export const ROOT = "/research/";

export function slugOf(path: string): string {
  if (!path.startsWith(ROOT)) return "";
  try {
    return decodeURIComponent(path.slice(ROOT.length)).replace(/\/$/, "");
  } catch {
    return path.slice(ROOT.length).replace(/\/$/, "");
  }
}

export const hrefOf = (slug: string) => `${ROOT}${encodeURIComponent(slug)}/`;

export const sourceOf = (slug: string) => `research/${slug}/README.md`;

export const codeOf = (slug: string) => `/git/${sourceOf(slug)}`;

export const cards = (topics: Carded[]) =>
  topics.map((one) => ({ name: one.title, href: hrefOf(one.slug), figure: one.figure }));

export function shelf<T extends Shelved>(topics: T[], query = ""): T[] {
  const want = query.trim().toLowerCase();
  const hit = (one: T) => !want || `${one.title}\n${one.lead ?? ""}`.toLowerCase().includes(want);
  return topics.filter(hit).sort((a, b) => b.date.localeCompare(a.date) || a.title.localeCompare(b.title));
}

export const many = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;
