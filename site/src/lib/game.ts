export type Game = {
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

const BASE = "/cdn/game/g";

export const gameName = (name: string) => /^[0-9a-f]{8}$/.test(String(name ?? ""));

export const gameVideo = (name: string) => `${BASE}/${name}/game.mp4`;

export const gameMaster = (name: string) => `${BASE}/${name}/game-1080.mp4`;

export const gamePoster = (name: string) => `${BASE}/${name}/poster.webp`;

export const gameManifest = (name: string) => `${BASE}/${name}/manifest.json`;

export const gameRoute = (name: string) => `/games/${name}/`;

/* INDEX */

export function games(text: string): Game[] {
  let rows: unknown = null;
  try {
    rows = JSON.parse(text);
  } catch {
    return [];
  }
  if (!Array.isArray(rows)) return [];
  const out: Game[] = [];
  for (const one of rows as Record<string, unknown>[]) {
    if (!one || !gameName(one.name as string)) continue;
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
