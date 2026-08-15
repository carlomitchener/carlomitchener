import { Cell3d } from "./models";
import type { RGBA } from "../colors";

export type CellDict3d = {
  width: number;
  height: number;
  depth: number;
  types?: number[][][];
  colors?: number[][][][];
  tags?: number[][][];
};

// 3D

export function toDict3d(cell: Cell3d): CellDict3d {
  const data: CellDict3d = { width: cell.width, height: cell.height, depth: cell.depth };
  if (cell._types !== null) data.types = cell._types;
  if (cell._colors !== null)
    data.colors = cell._colors.map((layer) => layer.map((row) => row.map((c) => (c ? [...c] : [0, 0, 0, 0]))));
  if (cell._tags !== null) data.tags = cell._tags;
  return data;
}

export function fromDict3d(data: CellDict3d): Cell3d {
  return new Cell3d({
    width: data.width,
    height: data.height,
    depth: data.depth,
    types: data.types ?? null,
    colors: data.colors ? (data.colors.map((l) => l.map((r) => r.map((c) => c as RGBA))) as RGBA[][][]) : null,
    tags: data.tags ?? null,
  });
}

export function toList3d(cell: Cell3d): number[][][] {
  return cell.types.map((layer) => layer.map((row) => row.slice()));
}

export function fromList3d(data: number[][][]): Cell3d {
  return new Cell3d({ types: data });
}

export function toStrings3d(cell: Cell3d): string[][] {
  return cell.types.map((layer) => layer.map((row) => row.join("")));
}

export function fromStrings3d(data: string[][]): Cell3d {
  const types = data.map((layer) => layer.map((row) => [...row].map(Number)));
  return new Cell3d({ types });
}
