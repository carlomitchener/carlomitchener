import { MrlyError } from "../errors";
import type { RGBA } from "../colors";
import type { Mode } from "../enums";
import { toDict2d, fromDict2d, toList2d, fromList2d, toStrings2d, fromStrings2d, type CellDict2d } from "./serializer";
import { invert2d, pad2d, rotate2d, fractal2d, tile2d, layers2d, neighbors2d } from "./geometry";
import { paint2d } from "./painter";
import { text2d, toSVG2d, type SVGOptions } from "../../lib/render/two";

export type PaletteMap = Record<number, import("../colors").Color[]>;

// HELPERS

function zeros2dArray(height: number, width: number): number[][] {
  const grid: number[][] = [];
  for (let y = 0; y < height; y++) {
    grid.push(new Array(width).fill(0));
  }
  return grid;
}

function nullColors2d(height: number, width: number): RGBA[][] {
  const grid: RGBA[][] = [];
  for (let y = 0; y < height; y++) {
    const row: RGBA[] = [];
    for (let x = 0; x < width; x++) row.push([0, 0, 0, 0]);
    grid.push(row);
  }
  return grid;
}

function deepCopy2d(grid: number[][]): number[][] {
  return grid.map((row) => row.slice());
}

function deepCopyColors2d(grid: RGBA[][]): RGBA[][] {
  return grid.map((row) => row.map((c) => [...c] as RGBA));
}

// CELL2D

export interface Cell2dOptions {
  width?: number;
  height?: number;
  types?: number[][] | null;
  colors?: RGBA[][] | null;
  tags?: number[][] | null;
}

export class Cell2d {
  _types: number[][] | null;
  _colors: RGBA[][] | null;
  _tags: number[][] | null;
  private _width: number | null;
  private _height: number | null;

  constructor(opts: Cell2dOptions = {}) {
    this._types = opts.types ?? null;
    this._colors = opts.colors ?? null;
    this._tags = opts.tags ?? null;
    this._width = opts.width ?? null;
    this._height = opts.height ?? null;
  }

  get width(): number {
    if (this._types) return this._types[0].length;
    if (this._colors) return this._colors[0].length;
    if (this._tags) return this._tags[0].length;
    if (this._width !== null) return this._width;
    throw new MrlyError("Cell2d has no data and no dimensions");
  }

  get height(): number {
    if (this._types) return this._types.length;
    if (this._colors) return this._colors.length;
    if (this._tags) return this._tags.length;
    if (this._height !== null) return this._height;
    throw new MrlyError("Cell2d has no data and no dimensions");
  }

  get types(): number[][] {
    if (this._types === null) this._types = zeros2dArray(this.height, this.width);
    return this._types;
  }

  set types(value: number[][]) {
    this._types = value;
  }

  get colors(): RGBA[][] {
    if (this._colors === null) this._colors = nullColors2d(this.height, this.width);
    return this._colors;
  }

  set colors(value: RGBA[][] | null) {
    this._colors = value;
  }

  get tags(): number[][] {
    if (this._tags === null) this._tags = zeros2dArray(this.height, this.width);
    return this._tags;
  }

  set tags(value: number[][] | null) {
    this._tags = value;
  }

  // MAIN

  shape(): [number, number] {
    return [this.height, this.width];
  }

  toString(): string {
    return `Cell2d(width=${this.width}, height=${this.height})`;
  }

  copy(): Cell2d {
    return new Cell2d({
      types: this._types ? deepCopy2d(this._types) : null,
      colors: this._colors ? deepCopyColors2d(this._colors) : null,
      tags: this._tags ? deepCopy2d(this._tags) : null,
      width: this._width ?? undefined,
      height: this._height ?? undefined,
    });
  }

  to3dTypes(): number[][][] {
    return [this.types.map((r: number[]) => r.slice())];
  }

  static from3d(cell: { types: number[][][] }): Cell2d {
    return new Cell2d({ types: cell.types[0].map((r: number[]) => r.slice()) });
  }

  // SERIALIZER

  toDict(): CellDict2d {
    return toDict2d(this);
  }

  static fromDict(data: CellDict2d): Cell2d {
    return fromDict2d(data);
  }

  toList(): number[][] {
    return toList2d(this);
  }

  static fromList(data: number[][]): Cell2d {
    return fromList2d(data);
  }

  toStrings(): string[] {
    return toStrings2d(this);
  }

  static fromStrings(data: string[]): Cell2d {
    return fromStrings2d(data);
  }

  // GEOMETRY

  invert(): Cell2d {
    return invert2d(this);
  }

  pad(count: number = 1, value: number = 0): Cell2d {
    return pad2d(this, count, value);
  }

  rotate(k: number = 1): Cell2d {
    return rotate2d(this, k);
  }

  fractal(level: number = 1): Cell2d {
    return fractal2d(this, level);
  }

  tile(width: number, height: number): Cell2d {
    return tile2d(this, width, height);
  }

  layers(): Cell2d {
    return layers2d(this);
  }

  neighbors(mask: number[][], target: number = 1, mode: string = "constant"): Cell2d {
    return neighbors2d(this, mask, target, mode);
  }

  // PAINTER

  paint(palette?: PaletteMap, mode?: Mode): Cell2d {
    return paint2d(this, palette, mode);
  }

  // RENDERER

  text(mapping?: Record<number, string>): string[] {
    return text2d(this.types, mapping);
  }

  toSVG(options?: SVGOptions): string {
    return toSVG2d(this, options);
  }

  toOBJ(): string {
    throw new MrlyError("toOBJ is only available on Cell3d");
  }
}
