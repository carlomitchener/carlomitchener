import { MrlyError } from "../errors";
import type { RGBA } from "../colors";
import * as binary from "../binary";
import { Cell3d } from "./models";

// 3D - PUBLIC - IMMUTABLE

export function merge3d(cells: Cell3d[], width: number, height: number, depth: number): Cell3d {
  if (!cells.length) throw new MrlyError("Cannot merge an empty list of cells.");
  if (cells.length !== width * height * depth)
    throw new MrlyError(`len(cells) != width * height * depth: ${cells.length} != ${width} * ${height} * ${depth}`);
  const cw = cells[0].width;
  const ch = cells[0].height;
  const cd = cells[0].depth;
  const totalW = width * cw;
  const totalH = height * ch;
  const totalD = depth * cd;
  const result = new Cell3d({ width: totalW, height: totalH, depth: totalD });
  for (let i = 0; i < cells.length; i++) {
    const cell = cells[i];
    if (cell.width !== cw || cell.height !== ch || cell.depth !== cd)
      throw new MrlyError("All cells in a merge operation must have the same dimensions.");
    const x = i % width;
    const y = Math.floor(i / width) % height;
    const z = Math.floor(i / (width * height));
    const startX = x * cw;
    const startY = y * ch;
    const startZ = z * cd;
    if (cell._types !== null) {
      const types = result.types;
      for (let dz = 0; dz < cd; dz++) {
        for (let dy = 0; dy < ch; dy++) {
          for (let dx = 0; dx < cw; dx++) {
            types[startZ + dz][startY + dy][startX + dx] = cell.types[dz][dy][dx];
          }
        }
      }
    }
  }
  return result;
}

export function combine3d(cell1: Cell3d, cell2: Cell3d): Cell3d {
  const newTypes = binary.kron3d(cell1.types, cell2.types);
  return new Cell3d({ types: newTypes });
}

export function magic3d(cells: Cell3d[]): Cell3d {
  if (cells.length < 2) throw new MrlyError("Magic composition requires at least two cells.");
  let result = combine3d(cells[0], cells[1]);
  for (let i = 2; i < cells.length; i++) {
    result = combine3d(result, cells[i]);
  }
  return result;
}

export function special3d(mask: number[][][], cell: Cell3d): Cell3d {
  const depth = mask.length;
  const height = mask[0].length;
  const width = mask[0][0].length;
  const newCells: Cell3d[] = [];
  for (let z = 0; z < depth; z++) {
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        newCells.push(cell.copy().rotate(mask[z][y][x]));
      }
    }
  }
  return merge3d(newCells, width, height, depth);
}

export function mosaic3d(mask: number[][][], cells: Cell3d[]): Cell3d {
  const depth = mask.length;
  const height = mask[0].length;
  const width = mask[0][0].length;
  const newCells: Cell3d[] = [];
  for (let z = 0; z < depth; z++) {
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        newCells.push(cells[mask[z][y][x]].copy());
      }
    }
  }
  return merge3d(newCells, width, height, depth);
}

// 3D HELPERS

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

// 3D - PRIVATE - MUTABLE

export function invert3d(cell: Cell3d): Cell3d {
  if (cell._types !== null) {
    cell.types = cell.types.map((layer) => layer.map((row) => row.map((v) => 1 - v)));
  }
  return cell;
}

export function pad3d(cell: Cell3d, count: number = 1, value: number = 0): Cell3d {
  if (cell._types !== null) {
    const t = cell.types;
    const d = t.length,
      h = t[0].length,
      w = t[0][0].length;
    const nd = d + 2 * count,
      nh = h + 2 * count,
      nw = w + 2 * count;
    const result: number[][][] = [];
    for (let z = 0; z < nd; z++) {
      const layer: number[][] = [];
      for (let y = 0; y < nh; y++) {
        const row: number[] = [];
        for (let x = 0; x < nw; x++) {
          const sz = z - count,
            sy = y - count,
            sx = x - count;
          if (sz >= 0 && sz < d && sy >= 0 && sy < h && sx >= 0 && sx < w) {
            row.push(t[sz][sy][sx]);
          } else {
            row.push(value);
          }
        }
        layer.push(row);
      }
      result.push(layer);
    }
    cell.types = result;
  }
  if (cell._colors !== null) {
    const c = cell._colors;
    const d = c.length,
      h = c[0].length,
      w = c[0][0].length;
    const nd = d + 2 * count,
      nh = h + 2 * count,
      nw = w + 2 * count;
    const result: RGBA[][][] = [];
    for (let z = 0; z < nd; z++) {
      const layer: RGBA[][] = [];
      for (let y = 0; y < nh; y++) {
        const row: RGBA[] = [];
        for (let x = 0; x < nw; x++) {
          const sz = z - count,
            sy = y - count,
            sx = x - count;
          if (sz >= 0 && sz < d && sy >= 0 && sy < h && sx >= 0 && sx < w) {
            row.push([...c[sz][sy][sx]] as RGBA);
          } else {
            row.push([0, 0, 0, 0]);
          }
        }
        layer.push(row);
      }
      result.push(layer);
    }
    cell.colors = result;
  }
  if (cell._tags !== null) {
    const tg = cell._tags;
    const d = tg.length,
      h = tg[0].length,
      w = tg[0][0].length;
    const nd = d + 2 * count,
      nh = h + 2 * count,
      nw = w + 2 * count;
    const result: number[][][] = [];
    for (let z = 0; z < nd; z++) {
      const layer: number[][] = [];
      for (let y = 0; y < nh; y++) {
        const row: number[] = [];
        for (let x = 0; x < nw; x++) {
          const sz = z - count,
            sy = y - count,
            sx = x - count;
          if (sz >= 0 && sz < d && sy >= 0 && sy < h && sx >= 0 && sx < w) {
            row.push(tg[sz][sy][sx]);
          } else {
            row.push(0);
          }
        }
        layer.push(row);
      }
      result.push(layer);
    }
    cell.tags = result;
  }
  return cell;
}

export function rotate3d(cell: Cell3d, k: number = 1, axes: [number, number] = [1, 2]): Cell3d {
  if (k % 4 === 0) return cell;
  const effectiveK = ((k % 4) + 4) % 4;
  if (cell._types !== null) {
    let types = cell._types;
    for (let i = 0; i < effectiveK; i++) {
      if (axes[0] === 1 && axes[1] === 2) {
        const rotated: number[][][] = [];
        for (let z = 0; z < types.length; z++) {
          rotated.push(rot90_2d(types[z], 1));
        }
        types = rotated;
      }
    }
    cell.types = types;
  }
  if (cell._colors !== null) {
    let colors = cell._colors;
    for (let i = 0; i < effectiveK; i++) {
      if (axes[0] === 1 && axes[1] === 2) {
        const rotated: RGBA[][][] = [];
        for (let z = 0; z < colors.length; z++) {
          rotated.push(rot90_2d(colors[z], 1));
        }
        colors = rotated;
      }
    }
    cell.colors = colors;
  }
  if (cell._tags !== null) {
    let tags = cell._tags;
    for (let i = 0; i < effectiveK; i++) {
      if (axes[0] === 1 && axes[1] === 2) {
        const rotated: number[][][] = [];
        for (let z = 0; z < tags.length; z++) {
          rotated.push(rot90_2d(tags[z], 1));
        }
        tags = rotated;
      }
    }
    cell.tags = tags;
  }
  return cell;
}

export function fractal3d(cell: Cell3d, level: number): Cell3d {
  if (level < 1) throw new MrlyError("Fractal level must be at least 1.");
  if (level === 1) return cell;
  let newTypes = cell.types;
  const original = cell.types.map((l) => l.map((r) => r.slice()));
  for (let i = 1; i < level; i++) {
    newTypes = binary.kron3d(newTypes, original);
  }
  cell.types = newTypes;
  cell.colors = null;
  cell.tags = null;
  return cell;
}

export function tile3d(cell: Cell3d, width: number, height: number, depth: number): Cell3d {
  if (cell._types !== null) {
    const t = cell.types;
    const d = t.length,
      h = t[0].length,
      w = t[0][0].length;
    const result: number[][][] = [];
    for (let z = 0; z < d * depth; z++) {
      const layer: number[][] = [];
      for (let y = 0; y < h * height; y++) {
        const row: number[] = [];
        for (let x = 0; x < w * width; x++) {
          row.push(t[z % d][y % h][x % w]);
        }
        layer.push(row);
      }
      result.push(layer);
    }
    cell.types = result;
  }
  if (cell._colors !== null) {
    const c = cell._colors;
    const d = c.length,
      h = c[0].length,
      w = c[0][0].length;
    const result: RGBA[][][] = [];
    for (let z = 0; z < d * depth; z++) {
      const layer: RGBA[][] = [];
      for (let y = 0; y < h * height; y++) {
        const row: RGBA[] = [];
        for (let x = 0; x < w * width; x++) {
          row.push([...c[z % d][y % h][x % w]] as RGBA);
        }
        layer.push(row);
      }
      result.push(layer);
    }
    cell.colors = result;
  }
  if (cell._tags !== null) {
    const tg = cell._tags;
    const d = tg.length,
      h = tg[0].length,
      w = tg[0][0].length;
    const result: number[][][] = [];
    for (let z = 0; z < d * depth; z++) {
      const layer: number[][] = [];
      for (let y = 0; y < h * height; y++) {
        const row: number[] = [];
        for (let x = 0; x < w * width; x++) {
          row.push(tg[z % d][y % h][x % w]);
        }
        layer.push(row);
      }
      result.push(layer);
    }
    cell.tags = result;
  }
  return cell;
}

export function layers3d(cell: Cell3d): Cell3d {
  const d = cell.depth;
  const h = cell.height;
  const w = cell.width;
  const centerZ = (d - 1) / 2;
  const centerY = (h - 1) / 2;
  const centerX = (w - 1) / 2;
  const tags: number[][][] = [];
  for (let z = 0; z < d; z++) {
    const layer: number[][] = [];
    for (let y = 0; y < h; y++) {
      const row: number[] = [];
      for (let x = 0; x < w; x++) {
        const dz = Math.abs(z - centerZ);
        const dy = Math.abs(y - centerY);
        const dx = Math.abs(x - centerX);
        row.push(Math.floor(dx + dy + dz));
      }
      layer.push(row);
    }
    tags.push(layer);
  }
  cell.tags = tags;
  return cell;
}

export function neighbors3d(cell: Cell3d, mode: string = "constant"): Cell3d {
  if (mode !== "constant" && mode !== "wrap") throw new MrlyError("Boundary (mode) must be 'constant' or 'wrap'.");
  const types = cell.types;
  const d = types.length;
  const h = types[0].length;
  const w = types[0][0].length;
  const padD = d + 2,
    padH = h + 2,
    padW = w + 2;
  const padded: number[][][] = [];
  for (let z = 0; z < padD; z++) {
    const layer: number[][] = [];
    for (let y = 0; y < padH; y++) {
      const row: number[] = [];
      for (let x = 0; x < padW; x++) {
        let sz = z - 1,
          sy = y - 1,
          sx = x - 1;
        if (mode === "wrap") {
          sz = ((sz % d) + d) % d;
          sy = ((sy % h) + h) % h;
          sx = ((sx % w) + w) % w;
          row.push(types[sz][sy][sx]);
        } else {
          if (sz >= 0 && sz < d && sy >= 0 && sy < h && sx >= 0 && sx < w) {
            row.push(types[sz][sy][sx]);
          } else {
            row.push(0);
          }
        }
      }
      layer.push(row);
    }
    padded.push(layer);
  }
  const tags: number[][][] = [];
  for (let z = 0; z < d; z++) {
    const layer: number[][] = [];
    for (let y = 0; y < h; y++) {
      const row: number[] = [];
      for (let x = 0; x < w; x++) {
        let count = 0;
        for (let dz = 0; dz < 3; dz++) {
          for (let dy = 0; dy < 3; dy++) {
            for (let dx = 0; dx < 3; dx++) {
              if (dz === 1 && dy === 1 && dx === 1) continue;
              count += padded[z + dz][y + dy][x + dx];
            }
          }
        }
        row.push(count);
      }
      layer.push(row);
    }
    tags.push(layer);
  }
  cell.tags = tags;
  return cell;
}
