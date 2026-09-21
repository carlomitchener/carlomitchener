import { escape } from "./md.ts";

/* PAIRS */

export type Pair = { dark: string; light: string };

export const SHADE = "screen and (prefers-color-scheme: dark)";

export const halves = (pair: Pair, alt = "", cls = "", extra = "") =>
  `<source data-dark srcset="${pair.dark}" media="${SHADE}" type="image/webp">` +
  `<img${cls ? ` class="${escape(cls)}"` : ""} src="${pair.light}" alt="${escape(alt)}" width="1024" height="1024"${extra}>`;

export const themed = (pair: Pair, alt = "", cls = "", extra = "") => `<picture>${halves(pair, alt, cls, extra)}</picture>`;
