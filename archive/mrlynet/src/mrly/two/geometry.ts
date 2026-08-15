import { MrlyError } from "../errors";
import type { RGBA } from "../colors";
import * as binary from "../binary";
import { Cell2d } from "./models";

// 2D - PUBLIC - IMMUTABLE

export function merge2d(cells: Cell2d[], width: number, height: number): Cell2d {
  if (!cells.length) throw new MrlyError("Cannot merge an empty list of cells.");
  if (cells.length !== width * height) throw new MrlyError(`Expected ${width * height} cells, got ${cells.length}`);
  const cw = cells[0].width;
  const ch = cells[0].height;
  const totalW = width * cw;
  const totalH = height * ch;
  const result = new Cell2d({ width: totalW, height: totalH });
  for (let i = 0; i < cells.length; i++) {
    const cell = cells[i];
    if (cell.width !== cw || cell.height !== ch)
      throw new MrlyError("All cells in a merge operation must have the same dimensions.");
    const x = i % width;
    const y = Math.floor(i / width);
    const startX = x * cw;
    const startY = y * ch;
    if (cell._types !== null) {
      const types = result.types;
      for (let dy = 0; dy < ch; dy++) {
        for (let dx = 0; dx < cw; dx++) {
          types[startY + dy][startX + dx] = cell.types[dy][dx];
        }
      }
    }
    if (cell._colors !== null) {
      const colors = result.colors;
      for (let dy = 0; dy < ch; dy++) {
        for (let dx = 0; dx < cw; dx++) {
          colors[startY + dy][startX + dx] = [...cell.colors[dy][dx]] as [number, number, number, number];
        }
      }
    }
    if (cell._tags !== null) {
      const tags = result.tags;
      for (let dy = 0; dy < ch; dy++) {
        for (let dx = 0; dx < cw; dx++) {
          tags[startY + dy][startX + dx] = cell.tags[dy][dx];
        }
      }
    }
  }
  return result;
}

export function combine2d(cell1: Cell2d, cell2: Cell2d): Cell2d {
  const newTypes = binary.kron2d(cell1.types, cell2.types);
  return new Cell2d({ types: newTypes });
}

export function magic2d(cells: Cell2d[]): Cell2d {
  if (cells.length < 2) throw new MrlyError("Magic composition requires at least two cells.");
  let result = combine2d(cells[0], cells[1]);
  for (let i = 2; i < cells.length; i++) {
    result = combine2d(result, cells[i]);
  }
  return result;
}

export function special2d(mask: number[][], cell: Cell2d): Cell2d {
  const height = mask.length;
  const width = mask[0].length;
  const newCells: Cell2d[] = [];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const rotation = mask[y][x];
      if (rotation < 0 || rotation > 3)
        throw new MrlyError(`Invalid rotation value '${rotation}'. Must be 0, 1, 2, or 3.`);
      newCells.push(cell.copy().rotate(rotation));
    }
  }
  return merge2d(newCells, width, height);
}

export function mosaic2d(mask: number[][], cells: Cell2d[]): Cell2d {
  const height = mask.length;
  const width = mask[0].length;
  const newCells: Cell2d[] = [];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      newCells.push(cells[mask[y][x]].copy());
    }
  }
  return merge2d(newCells, width, height);
}

// 2D HELPERS

function rot90_2d<T>(grid: T[][], k: number): T[][] {
  k = ((k % 4) + 4) % 4;
  let result = grid;
  for (let i = 0; i < k; i++) {
    const h = result.length;
    const w = (result[0] as T[]).length;
    const rotated: T[][] = [];
    for (let y = 0; y < w; y++) {
      const row: T[] = [];
      for (let x = 0; x < h; x++) {
        row.push(result[h - 1 - x][y]);
      }
      rotated.push(row);
    }
    result = rotated;
  }
  return result;
}

function pad2dArray(grid: number[][], count: number, value: number): number[][] {
  const h = grid.length;
  const w = grid[0].length;
  const newH = h + 2 * count;
  const newW = w + 2 * count;
  const result: number[][] = [];
  for (let y = 0; y < newH; y++) {
    const row: number[] = [];
    for (let x = 0; x < newW; x++) {
      const sy = y - count;
      const sx = x - count;
      if (sy >= 0 && sy < h && sx >= 0 && sx < w) {
        row.push(grid[sy][sx]);
      } else {
        row.push(value);
      }
    }
    result.push(row);
  }
  return result;
}

function padColors2dArray(grid: RGBA[][], count: number): RGBA[][] {
  const h = grid.length;
  const w = grid[0].length;
  const newH = h + 2 * count;
  const newW = w + 2 * count;
  const result: RGBA[][] = [];
  for (let y = 0; y < newH; y++) {
    const row: RGBA[] = [];
    for (let x = 0; x < newW; x++) {
      const sy = y - count;
      const sx = x - count;
      if (sy >= 0 && sy < h && sx >= 0 && sx < w) {
        row.push([...grid[sy][sx]] as RGBA);
      } else {
        row.push([0, 0, 0, 0]);
      }
    }
    result.push(row);
  }
  return result;
}

function tile2dArray(grid: number[][], th: number, tw: number): number[][] {
  const h = grid.length;
  const w = grid[0].length;
  const result: number[][] = [];
  for (let y = 0; y < h * th; y++) {
    const row: number[] = [];
    for (let x = 0; x < w * tw; x++) {
      row.push(grid[y % h][x % w]);
    }
    result.push(row);
  }
  return result;
}

function tileColors2dArray(grid: RGBA[][], th: number, tw: number): RGBA[][] {
  const h = grid.length;
  const w = grid[0].length;
  const result: RGBA[][] = [];
  for (let y = 0; y < h * th; y++) {
    const row: RGBA[] = [];
    for (let x = 0; x < w * tw; x++) {
      row.push([...grid[y % h][x % w]] as RGBA);
    }
    result.push(row);
  }
  return result;
}

// 2D - PRIVATE - MUTABLE

export function invert2d(cell: Cell2d): Cell2d {
  if (cell._types !== null) {
    cell.types = cell.types.map((row) => row.map((v) => 1 - v));
  }
  return cell;
}

export function pad2d(cell: Cell2d, count: number = 1, value: number = 0): Cell2d {
  if (cell._types !== null) cell.types = pad2dArray(cell.types, count, value);
  if (cell._colors !== null) cell.colors = padColors2dArray(cell.colors, count);
  if (cell._tags !== null) cell.tags = pad2dArray(cell.tags, count, value);
  return cell;
}

export function rotate2d(cell: Cell2d, k: number = 1): Cell2d {
  if (k % 4 === 0) return cell;
  if (cell._types !== null) cell.types = rot90_2d(cell.types, k);
  if (cell._colors !== null) cell.colors = rot90_2d(cell.colors, k);
  if (cell._tags !== null) cell.tags = rot90_2d(cell.tags, k);
  return cell;
}

export function fractal2d(cell: Cell2d, level: number): Cell2d {
  if (level < 1) throw new MrlyError("Fractal level must be at least 1.");
  if (level === 1) return cell;
  let newTypes = cell.types;
  const original = cell.types.map((r) => r.slice());
  for (let i = 1; i < level; i++) {
    newTypes = binary.kron2d(newTypes, original);
  }
  cell.types = newTypes;
  cell.colors = null;
  cell.tags = null;
  return cell;
}

export function tile2d(cell: Cell2d, width: number, height: number): Cell2d {
  if (cell._types !== null) cell.types = tile2dArray(cell.types, height, width);
  if (cell._colors !== null) cell.colors = tileColors2dArray(cell.colors, height, width);
  if (cell._tags !== null) cell.tags = tile2dArray(cell.tags, height, width);
  return cell;
}

export function layers2d(cell: Cell2d): Cell2d {
  const h = cell.height;
  const w = cell.width;
  const centerY = (h - 1) / 2;
  const centerX = (w - 1) / 2;
  const tags: number[][] = [];
  for (let y = 0; y < h; y++) {
    const row: number[] = [];
    for (let x = 0; x < w; x++) {
      const dy = Math.floor(Math.abs(y - centerY));
      const dx = Math.floor(Math.abs(x - centerX));
      row.push(Math.max(dx, dy));
    }
    tags.push(row);
  }
  cell.tags = tags;
  return cell;
}

export function neighbors2d(cell: Cell2d, mask: number[][], target: number = 1, mode: string = "constant"): Cell2d {
  const maskH = mask.length;
  const maskW = mask[0].length;
  if (maskH % 2 === 0 || maskW % 2 === 0) throw new MrlyError("Neighborhood (mask) dimensions must be odd.");
  if (target !== 0 && target !== 1) throw new MrlyError("Bit to count (target) must be 0 or 1.");
  if (mode !== "constant" && mode !== "wrap") throw new MrlyError("Boundary (mode) must be 'constant' or 'wrap'.");
  const h = cell.height;
  const w = cell.width;
  const types = cell.types;
  const bit: number[][] = types.map((row) => row.map((v) => (v === target ? 1 : 0)));
  const py = Math.floor(maskH / 2);
  const px = Math.floor(maskW / 2);
  const padH = h + 2 * py;
  const padW = w + 2 * px;
  const padded: number[][] = [];
  for (let y = 0; y < padH; y++) {
    const row: number[] = [];
    for (let x = 0; x < padW; x++) {
      let sy = y - py;
      let sx = x - px;
      if (mode === "wrap") {
        sy = ((sy % h) + h) % h;
        sx = ((sx % w) + w) % w;
        row.push(bit[sy][sx]);
      } else {
        if (sy >= 0 && sy < h && sx >= 0 && sx < w) {
          row.push(bit[sy][sx]);
        } else {
          row.push(0);
        }
      }
    }
    padded.push(row);
  }
  const tags: number[][] = [];
  for (let y = 0; y < h; y++) {
    const row: number[] = [];
    for (let x = 0; x < w; x++) {
      let count = 0;
      for (let r = 0; r < maskH; r++) {
        for (let c = 0; c < maskW; c++) {
          if (mask[r][c] === 1) {
            count += padded[y + r][x + c];
          }
        }
      }
      row.push(count);
    }
    tags.push(row);
  }
  cell.tags = tags;
  return cell;
}
