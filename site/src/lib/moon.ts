import { LIVE_DAYS } from "../config/shop.ts";

export const DAY = 24 * 60 * 60 * 1000;

export const LUNAR = LIVE_DAYS * DAY;

export const expiry = (born: string | number) => new Date(born).getTime() + LUNAR;

export const left = (born: string | number, now = Date.now()) => Math.max(0, expiry(born) - now);

export const phase = (born: string | number, now = Date.now()) => Math.min(1, Math.max(0, (now - new Date(born).getTime()) / LUNAR));

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

export function moonName(f: number) {
  if (f < 0.04 || f > 0.96) return "New moon";
  if (f < 0.23) return "Waxing crescent";
  if (f < 0.27) return "First quarter";
  if (f < 0.48) return "Waxing gibbous";
  if (f < 0.52) return "Full moon";
  if (f < 0.73) return "Waning gibbous";
  if (f < 0.77) return "Last quarter";
  return "Waning crescent";
}

export function moonPath(f: number, r = 10, cx = 12, cy = 12) {
  const t = Math.cos(2 * Math.PI * f);
  const waxing = f < 0.5;
  const rx = Math.abs(t) * r;
  const bow = (t > 0) === waxing ? 0 : 1;
  return `M ${cx} ${cy - r} A ${r} ${r} 0 0 ${waxing ? 1 : 0} ${cx} ${cy + r} A ${rx} ${r} 0 0 ${bow} ${cx} ${cy - r} Z`;
}
