export type Post = {
  name: string;
  seed: number;
  at: string;
  duration: number;
  frames: number;
  size: number;
  segments: number;
  canvas: number;
  story: string;
};

/* URLS */

const BASE = "/cdn/feed/p";

export const postName = (name: string) => /^[0-9a-f]{8}$/.test(String(name ?? ""));

export const postVideo = (name: string) => `${BASE}/${name}/${name}.mp4`;

export const postMaster = (name: string) => `${BASE}/${name}/${name}-1080.mp4`;

export const postPoster = (name: string) => `${BASE}/${name}/${name}.webp`;

export const postManifest = (name: string) => `${BASE}/${name}/${name}.json`;

export const postRoute = (name: string) => `/feed/${name}/`;

export const FEED_ROUTE = "/feed/";

/* INDEX */

export function posts(text: string): Post[] {
  let rows: unknown = null;
  try {
    rows = JSON.parse(text);
  } catch {
    return [];
  }
  if (!Array.isArray(rows)) return [];
  const out: Post[] = [];
  for (const one of rows as Record<string, unknown>[]) {
    if (!one || !postName(one.name as string)) continue;
    out.push({
      name: String(one.name),
      seed: Number(one.seed ?? 0),
      at: String(one.at ?? ""),
      duration: Number(one.duration ?? 0),
      frames: Number(one.frames ?? 0),
      size: Number(one.size ?? 0),
      segments: Number(one.segments ?? 0),
      canvas: Number(one.canvas ?? 0),
      story: String(one.story ?? ""),
    });
  }
  return out.sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : a.name < b.name ? 1 : -1));
}
