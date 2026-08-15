import { MrlyError } from "../errors";
import type { RGBA } from "../colors";
import type { Mode } from "../enums";
import { toDict3d, fromDict3d, toList3d, fromList3d, toStrings3d, fromStrings3d, type CellDict3d } from "./serializer";
import { invert3d, pad3d, rotate3d, fractal3d, tile3d, layers3d, neighbors3d } from "./geometry";
import { paint3d } from "./painter";
import { text3d, toOBJ } from "../../lib/render/three";

export type PaletteMap = Record<number, import("../colors").Color[]>;

// HELPERS

function zeros3dArray(depth: number, height: number, width: number): number[][][] {
  const grid: number[][][] = [];
  for (let z = 0; z < depth; z++) {
    const layer: number[][] = [];
    for (let y = 0; y < height; y++) {
      layer.push(new Array(width).fill(0));
    }
    grid.push(layer);
  }
  return grid;
}

function nullColors3d(depth: number, height: number, width: number): RGBA[][][] {
  const grid: RGBA[][][] = [];
  for (let z = 0; z < depth; z++) {
    const layer: RGBA[][] = [];
    for (let y = 0; y < height; y++) {
      const row: RGBA[] = [];
      for (let x = 0; x < width; x++) row.push([0, 0, 0, 0]);
      layer.push(row);
    }
    grid.push(layer);
  }
  return grid;
}

function deepCopy3d(grid: number[][][]): number[][][] {
  return grid.map((layer) => layer.map((row) => row.slice()));
}

function deepCopyColors3d(grid: RGBA[][][]): RGBA[][][] {
  return grid.map((layer) => layer.map((row) => row.map((c) => [...c] as RGBA)));
}

// CELL3D

export interface Cell3dOptions {
  width?: number;
  height?: number;
  depth?: number;
  types?: number[][][] | null;
  colors?: RGBA[][][] | null;
  tags?: number[][][] | null;
}

export class Cell3d {
  _types: number[][][] | null;
  _colors: RGBA[][][] | null;
  _tags: number[][][] | null;
  private _width: number | null;
  private _height: number | null;
  private _depth: number | null;

  constructor(opts: Cell3dOptions = {}) {
    this._types = opts.types ?? null;
    this._colors = opts.colors ?? null;
    this._tags = opts.tags ?? null;
    this._width = opts.width ?? null;
    this._height = opts.height ?? null;
    this._depth = opts.depth ?? null;
  }

  get width(): number {
    if (this._types) return this._types[0][0].length;
    if (this._colors) return this._colors[0][0].length;
    if (this._tags) return this._tags[0][0].length;
    if (this._width !== null) return this._width;
    throw new MrlyError("Cell3d has no data and no dimensions");
  }

  get height(): number {
    if (this._types) return this._types[0].length;
    if (this._colors) return this._colors[0].length;
    if (this._tags) return this._tags[0].length;
    if (this._height !== null) return this._height;
    throw new MrlyError("Cell3d has no data and no dimensions");
  }

  get depth(): number {
    if (this._types) return this._types.length;
    if (this._colors) return this._colors.length;
    if (this._tags) return this._tags.length;
    if (this._depth !== null) return this._depth;
    throw new MrlyError("Cell3d has no data and no dimensions");
  }

  get types(): number[][][] {
    if (this._types === null) this._types = zeros3dArray(this.depth, this.height, this.width);
    return this._types;
  }

  set types(value: number[][][]) {
    this._types = value;
  }

  get colors(): RGBA[][][] {
    if (this._colors === null) this._colors = nullColors3d(this.depth, this.height, this.width);
    return this._colors;
  }

  set colors(value: RGBA[][][] | null) {
    this._colors = value;
  }

  get tags(): number[][][] {
    if (this._tags === null) this._tags = zeros3dArray(this.depth, this.height, this.width);
    return this._tags;
  }

  set tags(value: number[][][] | null) {
    this._tags = value;
  }

  // MAIN

  shape(): [number, number, number] {
    return [this.depth, this.height, this.width];
  }

  toString(): string {
    return `Cell3d(width=${this.width}, height=${this.height}, depth=${this.depth})`;
  }

  copy(): Cell3d {
    return new Cell3d({
      types: this._types ? deepCopy3d(this._types) : null,
      colors: this._colors ? deepCopyColors3d(this._colors) : null,
      tags: this._tags ? deepCopy3d(this._tags) : null,
      width: this._width ?? undefined,
      height: this._height ?? undefined,
      depth: this._depth ?? undefined,
    });
  }

  to2dTypes(): number[][] {
    return this.types[0].map((r) => r.slice());
  }

  static from2d(cell: { types: number[][] }): Cell3d {
    return new Cell3d({ types: [cell.types.map((r) => r.slice())] });
  }

  extrude(depth: number = 1): Cell3d {
    if (depth < 1) throw new MrlyError("Extrusion depth must be at least 1.");
    const newTypes: number[][][] = [];
    for (const layer of this.types) {
      for (let i = 0; i < depth; i++) {
        newTypes.push(layer.map((r) => r.slice()));
      }
    }
    this._types = newTypes;
    return this;
  }

  // SERIALIZER

  toDict(): CellDict3d {
    return toDict3d(this);
  }

  static fromDict(data: CellDict3d): Cell3d {
    return fromDict3d(data);
  }

  toList(): number[][][] {
    return toList3d(this);
  }

  static fromList(data: number[][][]): Cell3d {
    return fromList3d(data);
  }

  toStrings(): string[][] {
    return toStrings3d(this);
  }

  static fromStrings(data: string[][]): Cell3d {
    return fromStrings3d(data);
  }

  // GEOMETRY

  invert(): Cell3d {
    return invert3d(this);
  }

  pad(count: number = 1, value: number = 0): Cell3d {
    return pad3d(this, count, value);
  }

  rotate(k: number = 1, axes: [number, number] = [1, 2]): Cell3d {
    return rotate3d(this, k, axes);
  }

  fractal(level: number = 1): Cell3d {
    return fractal3d(this, level);
  }

  tile(width: number, height: number, depth: number): Cell3d {
    return tile3d(this, width, height, depth);
  }

  layers(): Cell3d {
    return layers3d(this);
  }

  neighbors(mode: string = "constant"): Cell3d {
    return neighbors3d(this, mode);
  }

  // PAINTER

  paint(palette?: PaletteMap, mode?: Mode): Cell3d {
    return paint3d(this, palette, mode);
  }

  // RENDERER

  text(mapping?: Record<number, string>): string[] {
    return text3d(this.types, mapping);
  }

  toOBJ(): string {
    return toOBJ(this);
  }
}
