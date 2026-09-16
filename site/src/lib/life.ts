import { LIVE_DAYS } from "../config/shop.ts";

export const DAY = 24 * 60 * 60 * 1000;

export const LUNAR = LIVE_DAYS * DAY;

export const expiry = (born: string | number) => new Date(born).getTime() + LUNAR;

export const left = (born: string | number, now = Date.now()) => Math.max(0, expiry(born) - now);

export const juice = (born: string | number, now = Date.now()) => Math.min(100, (100 * left(born, now)) / LUNAR);

const pad = (n: number) => String(n).padStart(2, "0");

export function countdown(ms: number) {
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (s <= 0) return "Gone";
  if (s < 3600) return `${m}m ${pad(s % 60)}s`;
  if (d) return `${d}d ${pad(h)}h ${pad(m)}m`;
  return `${h}h ${pad(m)}m`;
}

export function label(born: string | number, now = Date.now()) {
  const ms = left(born, now);
  if (ms <= 0) return "Gone";
  if (now - new Date(born).getTime() < DAY) return "Just generated";
  if (ms < DAY) return "Leaving soon";
  return `${countdown(ms)} left`;
}
