import { Cell2d } from "./models";
import type { RGBA } from "../colors";

export type CellDict2d = {
  width: number;
  height: number;
  types?: number[][];
  colors?: number[][][];
  tags?: number[][];
};

// 2D

export function toDict2d(cell: Cell2d): CellDict2d {
  const data: CellDict2d = { width: cell.width, height: cell.height };
  if (cell._types !== null) data.types = cell._types;
  if (cell._colors !== null) data.colors = cell._colors.map((row) => row.map((c) => (c ? [...c] : [0, 0, 0, 0])));
  if (cell._tags !== null) data.tags = cell._tags;
  return data;
}

export function fromDict2d(data: CellDict2d): Cell2d {
  return new Cell2d({
    width: data.width,
    height: data.height,
    types: data.types ?? null,
    colors: data.colors ? (data.colors.map((row) => row.map((c) => c as RGBA)) as RGBA[][]) : null,
    tags: data.tags ?? null,
  });
}

export function toList2d(cell: Cell2d): number[][] {
  return cell.types.map((row) => row.slice());
}

export function fromList2d(data: number[][]): Cell2d {
  return new Cell2d({ types: data });
}

export function toStrings2d(cell: Cell2d): string[] {
  return cell.types.map((row) => row.join(""));
}

export function fromStrings2d(data: string[]): Cell2d {
  const types = data.map((row) => [...row].map(Number));
  return new Cell2d({ types });
}
