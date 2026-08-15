import { generate, render } from "./fractal";
import { mjColors } from "./colors";
import { alpha } from "../mrly";

const cache = new Map<string, string>();

export function getTileUrl(design: string, number: number, color: string, voidColor?: string): string {
  const key = voidColor ? `${design}-${number}-${color}-${voidColor}` : `${design}-${number}-${color}`;
  const cached = cache.get(key);
  if (cached) return cached;
  const grid = generate(design, number, 1);
  const size = grid.length;
  const scale = Math.max(1, Math.ceil(64 / size));
  const canvas = document.createElement("canvas");
  canvas.width = size * scale;
  canvas.height = size * scale;
  const fillEntry = mjColors.find((c) => c.name === color);
  if (!fillEntry) return "";
  const voidEntry = voidColor ? mjColors.find((c) => c.name === voidColor) : null;
  render(canvas, grid, fillEntry.color, voidEntry ? voidEntry.color : alpha);
  const url = canvas.toDataURL("image/png");
  cache.set(key, url);
  return url;
}
