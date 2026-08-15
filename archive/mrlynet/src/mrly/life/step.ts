import { Cell2d } from "../two/models";
import type { Boundary } from "./enums";

export function step(
  grid: Cell2d,
  mask: number[][],
  birth: number[],
  survive: number[],
  boundary: Boundary,
): Cell2d {
  const neighborCell = grid.neighbors(mask, 1, boundary);
  const counts = neighborCell.tags;
  const types = grid.types;
  const h = grid.height;
  const w = grid.width;
  const birthSet = new Set(birth);
  const surviveSet = new Set(survive);
  const next: number[][] = [];
  for (let y = 0; y < h; y++) {
    const row: number[] = new Array(w);
    for (let x = 0; x < w; x++) {
      const n = counts[y][x];
      const alive = types[y][x] === 1;
      row[x] = (alive ? surviveSet.has(n) : birthSet.has(n)) ? 1 : 0;
    }
    next.push(row);
  }
  return new Cell2d({ types: next });
}

export function gridKey(grid: number[][]): string {
  const parts: string[] = [];
  for (const row of grid) parts.push(row.join(""));
  return parts.join("|");
}

export function gridsEqual(a: number[][], b: number[][]): boolean {
  if (a.length !== b.length) return false;
  for (let y = 0; y < a.length; y++) {
    const ra = a[y];
    const rb = b[y];
    if (ra.length !== rb.length) return false;
    for (let x = 0; x < ra.length; x++) if (ra[x] !== rb[x]) return false;
  }
  return true;
}
