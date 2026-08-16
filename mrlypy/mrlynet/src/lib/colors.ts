import data from "./colors.json";
import { Color } from "../mrly";

export interface ColorDef {
  name: string;
  r: number;
  g: number;
  b: number;
}

export type MjColor = { name: string; color: Color };
export const mjColors: MjColor[] = data.map((c: ColorDef) => ({ name: c.name, color: new Color(c.r, c.g, c.b) }));

export const COLORS: ColorDef[] = data;
export const POOL = COLORS.filter((c) => c.name !== "black" && c.name !== "white");

function toCSS(c: ColorDef): string {
  return `rgb(${c.r},${c.g},${c.b})`;
}

// CSS HELPERS

export function randomColor(): string {
  return toCSS(POOL[Math.floor(Math.random() * POOL.length)]);
}

export function getUniqueColors(count: number): string[] {
  const shuffled = [...POOL];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.slice(0, count).map(toCSS);
}

// NAME HELPERS

export function randomColorName(): string {
  return POOL[Math.floor(Math.random() * POOL.length)].name;
}

export function getUniqueColorNames(count: number): string[] {
  const shuffled = [...POOL];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.slice(0, count).map((c) => c.name);
}

export function colorCSS(name: string): string {
  const c = COLORS.find((c) => c.name === name);
  return c ? toCSS(c) : "rgb(0,0,0)";
}

export function colorRGB(name: string): { r: number; g: number; b: number } {
  const c = COLORS.find((c) => c.name === name);
  return c ? { r: c.r, g: c.g, b: c.b } : { r: 0, g: 0, b: 0 };
}
