import { MrlyError } from "../errors";
import type { RGBA } from "../colors";
import { Cell2d } from "../two/models";
import { Cell3d } from "../three/models";
import { Cell6d } from "./models";

// CONSTANTS

export const VOID = 0;
export const FILL = 1;
export const GRID = 2;
export const UP = 3;
export const LEFT = 4;
export const RIGHT = 5;

export enum Orientation {
  HORIZONTAL = "horizontal",
  VERTICAL = "vertical",
}

// HELPERS

export function isCube(cell: Cell3d): boolean {
  return cell.width === cell.height && cell.height === cell.depth;
}

export function isHex(cell: Cell2d): boolean {
  const h = cell.height;
  const w = cell.width;
  if (w > h) {
    if (w % 2 === 0) return false;
    const dx = (3 * (w + 1)) >> 2;
    const rowShift = h >> 1;
    if ((dx + rowShift) % 2 !== 0) return false;
    return true;
  } else if (h > w) {
    const dy = (3 * (h + 1)) >> 2;
    const rowShift = w >> 1;
    if ((dy + rowShift) % 2 !== 0) return false;
    return true;
  }
  return false;
}

export function getOrientation(width: number, height: number): Orientation {
  if (width > height) return Orientation.HORIZONTAL;
  if (height > width) return Orientation.VERTICAL;
  throw new MrlyError("Cell must be a hexagon.");
}

export function checkOrientation(orientation: Orientation | string): Orientation {
  if (orientation === Orientation.HORIZONTAL || orientation === "horizontal") return Orientation.HORIZONTAL;
  if (orientation === Orientation.VERTICAL || orientation === "vertical") return Orientation.VERTICAL;
  throw new MrlyError("Unknown orientation.");
}

// BLANK

export function blank(
  radius: number,
  orientation: Orientation | string,
  fill: number = 1,
  voidVal: number = 0
): Cell6d {
  const orient = checkOrientation(orientation);
  const n = radius;
  let types: number[][];

  if (orient === Orientation.HORIZONTAL) {
    const height = 2 * n;
    const width = 4 * n - 1;
    types = [];
    for (let r = 0; r < height; r++) {
      const row: number[] = new Array(width).fill(fill);
      const p = Math.max(0, n - 1 - r, r - n);
      if (p > 0) {
        for (let i = 0; i < p; i++) row[i] = voidVal;
        for (let i = width - p; i < width; i++) row[i] = voidVal;
      }
      types.push(row);
    }
  } else {
    const width = 2 * n;
    let height = Math.floor((7 * n - 1) / 2);
    const rowShift = width >> 1;
    while ((Math.floor((3 * (height + 1)) / 4) + rowShift) % 2 !== 0) {
      height++;
    }
    types = [];
    for (let r = 0; r < height; r++) {
      const row: number[] = new Array(width).fill(fill);
      const p = Math.max(0, n - 1 - r, r - (height - n));
      if (p > 0) {
        for (let i = 0; i < p; i++) row[i] = voidVal;
        for (let i = width - p; i < width; i++) row[i] = voidVal;
      }
      types.push(row);
    }
  }

  return new Cell6d({ types });
}

// PAD

export function pad(cell: Cell2d, k: number = 1, val: number = 0): Cell6d {
  if (k < 1) return cell as Cell6d;
  if (!isHex(cell)) throw new MrlyError("Cell must be a hexagon.");
  const orient = getOrientation(cell.width, cell.height);
  const n = orient === Orientation.HORIZONTAL ? cell.height >> 1 : cell.width >> 1;
  const nNew = n + k;
  const base = blank(nNew, orient, val, GRID);
  const yOff = Math.floor((base.height - cell.height) / 2);
  const xOff = Math.floor((base.width - cell.width) / 2);
  const hPaste = Math.min(cell.height, base.height - yOff);
  const wPaste = Math.min(cell.width, base.width - xOff);

  for (let y = 0; y < hPaste; y++) {
    for (let x = 0; x < wPaste; x++) {
      const srcVal = cell.types[y][x];
      base.types[y + yOff][x + xOff] = srcVal === GRID ? val : srcVal;
    }
  }
  if (cell._colors !== null) {
    const baseColors = base.colors;
    const srcColors = cell.colors;
    for (let y = 0; y < hPaste; y++) {
      for (let x = 0; x < wPaste; x++) {
        baseColors[y + yOff][x + xOff] = [...srcColors[y][x]] as RGBA;
      }
    }
  }
  if (cell._tags !== null) {
    const baseTags = base.tags;
    const srcTags = cell.tags;
    for (let y = 0; y < hPaste; y++) {
      for (let x = 0; x < wPaste; x++) {
        baseTags[y + yOff][x + xOff] = srcTags[y][x];
      }
    }
  }
  return base;
}

// GEOMETRY

export function iso(cell: Cell3d): Cell6d {
  if (!isCube(cell)) throw new MrlyError("Cell must be a cube.");
  const grid = cell.types;
  const nX = grid.length;
  const nY = grid[0].length;
  const nZ = grid[0][0].length;
  const N = nX;
  const width = 2 * N;
  const height = 4 * N - 1;
  const types: number[][] = [];
  for (let r = 0; r < height; r++) {
    types.push(new Array(width).fill(GRID));
  }
  for (let z = 0; z < nZ; z++) {
    for (let y = 0; y < nY; y++) {
      for (let x = 0; x < nX; x++) {
        if (grid[x][y][z]) {
          const gx = x - y + (N - 1);
          const gy = x + y - 2 * z + (2 * N - 2);
          if (gx >= 0 && gx < width - 1 && gy >= 0 && gy < height - 2) {
            types[gy][gx] = UP;
            types[gy][gx + 1] = UP;
            types[gy + 1][gx] = LEFT;
            types[gy + 1][gx + 1] = RIGHT;
            types[gy + 2][gx] = LEFT;
            types[gy + 2][gx + 1] = RIGHT;
          }
        }
      }
    }
  }
  return new Cell6d({ types });
}

export function pro(cell: Cell3d): Cell6d {
  if (!isCube(cell)) throw new MrlyError("Cell must be a cube.");
  const grid = cell.types;
  const nX = grid.length;
  const nY = grid[0].length;
  const nZ = grid[0][0].length;
  const N = nX;
  const width = 2 * N;
  const height = 4 * N - 1;
  const types: number[][] = [];
  for (let r = 0; r < height; r++) {
    types.push(new Array(width).fill(GRID));
  }

  const y = nY - 1;
  for (let z = 0; z < nZ; z++) {
    for (let x = 0; x < nX; x++) {
      const val = grid[x][y][z];
      const gx = x - y + (N - 1);
      const gy = x + y - 2 * z + (2 * N - 2);
      const drawVal = val === 1 ? FILL : VOID;
      if (gx >= 0 && gx < width - 1 && gy >= 0 && gy < height - 2) {
        types[gy + 1][gx] = drawVal;
        types[gy + 2][gx] = drawVal;
      }
    }
  }

  const xFace = nX - 1;
  for (let z = 0; z < nZ; z++) {
    for (let yy = 0; yy < nY; yy++) {
      const val = grid[xFace][yy][z];
      const gx = xFace - yy + (N - 1);
      const gy = xFace + yy - 2 * z + (2 * N - 2);
      const drawVal = val === 1 ? FILL : VOID;
      if (gx >= 0 && gx < width - 1 && gy >= 0 && gy < height - 2) {
        types[gy + 1][gx + 1] = drawVal;
        types[gy + 2][gx + 1] = drawVal;
      }
    }
  }

  const zFace = nZ - 1;
  for (let yy = 0; yy < nY; yy++) {
    for (let x = 0; x < nX; x++) {
      const val = grid[x][yy][zFace];
      const gx = x - yy + (N - 1);
      const gy = x + yy - 2 * zFace + (2 * N - 2);
      const drawVal = val === 1 ? FILL : VOID;
      if (gx >= 0 && gx < width - 1 && gy >= 0 && gy < height - 2) {
        types[gy][gx] = drawVal;
        types[gy][gx + 1] = drawVal;
      }
    }
  }
  return new Cell6d({ types });
}

export function cut(cell: Cell3d): Cell6d {
  if (!isCube(cell)) throw new MrlyError("Cell must be a cube.");
  const scaleVal = 4;
  const grid = cell.types;
  const origSize = grid.length;
  const size = origSize * scaleVal;
  const scaled: number[][][] = [];
  for (let z = 0; z < size; z++) {
    const layer: number[][] = [];
    for (let y = 0; y < size; y++) {
      const row: number[] = [];
      for (let x = 0; x < size; x++) {
        row.push(grid[Math.floor(z / scaleVal)][Math.floor(y / scaleVal)][Math.floor(x / scaleVal)]);
      }
      layer.push(row);
    }
    scaled.push(layer);
  }
  const k = Math.floor((3 * (size - 1)) / 2);
  const rows: string[] = [];
  for (let z = 0; z < size; z += 2) {
    const target = k - z;
    const minX = Math.max(0, target - (size - 1));
    const maxX = Math.min(size - 1, target);
    if (minX > maxX) continue;
    let rowBits = "";
    for (let x = minX; x <= maxX; x++) {
      const yVal = target - x;
      rowBits += String(scaled[x][yVal][z]);
    }
    rows.push(rowBits);
  }
  if (rows.length === 0) return new Cell6d({ width: 1, height: 1 });
  const maxWidth = Math.max(...rows.map((r) => r.length));
  const height = rows.length;
  const types: number[][] = [];
  for (let r = 0; r < height; r++) {
    const row = new Array(maxWidth).fill(GRID);
    const paddingTotal = maxWidth - rows[r].length;
    const offset = Math.floor(paddingTotal / 2);
    for (let c = 0; c < rows[r].length; c++) {
      if (rows[r][c] === "1") {
        row[c + offset] = FILL;
      } else if (rows[r][c] === "0") {
        row[c + offset] = VOID;
      }
    }
    types.push(row);
  }
  return new Cell6d({ types });
}

// TILING

export function tessellate(cell: Cell2d, mask: number[][]): Cell6d {
  if (!isHex(cell)) throw new MrlyError("Cell must be a hexagon.");
  const orient = getOrientation(cell.width, cell.height);
  const tileH = cell.height;
  const tileW = cell.width;
  let dx: number, dy: number, rowShift: number;
  if (orient === Orientation.HORIZONTAL) {
    dx = Math.floor((3 * (tileW + 1)) / 4);
    dy = tileH;
    rowShift = tileH >> 1;
  } else {
    dx = tileW;
    dy = Math.floor((3 * (tileH + 1)) / 4);
    rowShift = tileW >> 1;
  }
  const positions: { r: number; c: number; px: number; py: number }[] = [];
  for (let r = 0; r < mask.length; r++) {
    for (let c = 0; c < mask[r].length; c++) {
      if (mask[r][c] === 0) continue;
      let posX: number, posY: number;
      if (orient === Orientation.HORIZONTAL) {
        posX = c * dx;
        posY = r * dy;
        if (c % 2 !== 0) posY += rowShift;
      } else {
        posX = c * dx;
        posY = r * dy;
        if (r % 2 !== 0) posX += rowShift;
      }
      positions.push({ r, c, px: posX, py: posY });
    }
  }
  if (positions.length === 0) return new Cell6d({ width: 1, height: 1 });
  const minX = Math.min(...positions.map((p) => p.px));
  const minY = Math.min(...positions.map((p) => p.py));
  const maxX = Math.max(...positions.map((p) => p.px + tileW));
  const maxY = Math.max(...positions.map((p) => p.py + tileH));
  const finalW = maxX - minX;
  const finalH = maxY - minY;
  const newTypes: number[][] = [];
  for (let y = 0; y < finalH; y++) {
    newTypes.push(new Array(finalW).fill(GRID));
  }
  let newColors: RGBA[][] | null = null;
  if (cell._colors !== null) {
    newColors = [];
    for (let y = 0; y < finalH; y++) {
      const row: RGBA[] = [];
      for (let x = 0; x < finalW; x++) row.push([0, 0, 0, 0]);
      newColors.push(row);
    }
  }
  let newTags: number[][] | null = null;
  if (cell._tags !== null) {
    newTags = [];
    for (let y = 0; y < finalH; y++) {
      newTags.push(new Array(finalW).fill(0));
    }
  }
  for (const pos of positions) {
    const destX = pos.px - minX;
    const destY = pos.py - minY;
    for (let y = 0; y < tileH; y++) {
      for (let x = 0; x < tileW; x++) {
        if (cell.types[y][x] !== GRID) {
          newTypes[destY + y][destX + x] = cell.types[y][x];
        }
        if (newColors !== null && cell._colors !== null) {
          if (cell.types[y][x] !== GRID) {
            newColors[destY + y][destX + x] = [...cell.colors[y][x]] as RGBA;
          }
        }
        if (newTags !== null && cell._tags !== null) {
          if (cell.types[y][x] !== GRID) {
            newTags[destY + y][destX + x] = cell.tags[y][x];
          }
        }
      }
    }
  }
  return new Cell6d({ types: newTypes, colors: newColors, tags: newTags });
}

// TILE

export function tile(cell: Cell2d, width: number, height: number): Cell6d {
  const mask: number[][] = [];
  for (let r = 0; r < height; r++) {
    mask.push(new Array(width).fill(1));
  }
  return tessellate(cell, mask);
}

export function tileCrop(cell: Cell2d, size: [number, number]): Cell6d {
  const [w, h] = size;
  const orient = getOrientation(w, h);
  let cropX: number, cropY: number;
  if (orient === Orientation.HORIZONTAL) {
    cropX = Math.floor((w - 1) / 4);
    cropY = h >> 1;
  } else {
    cropX = w >> 1;
    cropY = Math.floor((h - 1) / 4);
  }
  const currentH = cell.height;
  const currentW = cell.width;
  const startY = cropY;
  const endY = currentH - cropY;
  const startX = cropX;
  const endX = currentW - cropX;
  if (startY >= endY || startX >= endX) return new Cell6d({ types: [[0]] });
  const newTypes: number[][] = [];
  for (let y = startY; y < endY; y++) {
    newTypes.push(cell.types[y].slice(startX, endX));
  }
  let newColors: RGBA[][] | null = null;
  if (cell._colors !== null) {
    newColors = [];
    for (let y = startY; y < endY; y++) {
      newColors.push(cell.colors[y].slice(startX, endX).map((c) => [...c] as RGBA));
    }
  }
  let newTags: number[][] | null = null;
  if (cell._tags !== null) {
    newTags = [];
    for (let y = startY; y < endY; y++) {
      newTags.push(cell.tags[y].slice(startX, endX));
    }
  }
  return new Cell6d({ types: newTypes, colors: newColors, tags: newTags });
}

// RADIAL

export function getRadialMask(radius: number, orientation: Orientation | string): number[][] {
  if (radius < 1) return [[0]];
  const orient = checkOrientation(orientation);
  const size = 2 * radius - 1;
  const center = radius - 1;
  const mask: number[][] = [];
  for (let r = 0; r < size; r++) {
    mask.push(new Array(size).fill(0));
  }
  let cQ: number, cR: number;
  if (orient === Orientation.HORIZONTAL) {
    cQ = center;
    cR = center - Math.floor((center - (center & 1)) / 2);
  } else {
    cQ = center - Math.floor((center - (center & 1)) / 2);
    cR = center;
  }
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      let q: number, rAxial: number;
      if (orient === Orientation.HORIZONTAL) {
        q = c;
        rAxial = r - Math.floor((c - (c & 1)) / 2);
      } else {
        q = c - Math.floor((r - (r & 1)) / 2);
        rAxial = r;
      }
      const dq = q - cQ;
      const dr = rAxial - cR;
      if ((Math.abs(dq) + Math.abs(dr) + Math.abs(dq + dr)) / 2 < radius) {
        mask[r][c] = 1;
      }
    }
  }
  return mask;
}

export function radial(cell: Cell2d, radius: number): Cell6d {
  if (!isHex(cell)) throw new MrlyError("Cell must be a hexagon.");
  const orient = getOrientation(cell.width, cell.height);
  const mask = getRadialMask(radius, orient);
  return tessellate(cell, mask);
}

export function radialCrop(cell: Cell2d, radius: number, size: [number, number]): Cell6d {
  const [w, h] = size;
  const orient = getOrientation(w, h);
  let cropX: number, cropY: number;
  if (orient === Orientation.HORIZONTAL) {
    const rowShiftVal = h >> 1;
    cropX = rowShiftVal;
    cropY = (radius - 1) * rowShiftVal;
  } else {
    const rowShiftVal = w >> 1;
    cropY = rowShiftVal;
    cropX = (radius - 1) * rowShiftVal;
  }
  const currentH = cell.height;
  const currentW = cell.width;
  const startY = cropY;
  const endY = currentH - cropY;
  const startX = cropX;
  const endX = currentW - cropX;
  if (startY >= endY || startX >= endX) return new Cell6d({ types: [[0]] });
  const newTypes: number[][] = [];
  for (let y = startY; y < endY; y++) {
    newTypes.push(cell.types[y].slice(startX, endX));
  }
  let newColors: RGBA[][] | null = null;
  if (cell._colors !== null) {
    newColors = [];
    for (let y = startY; y < endY; y++) {
      newColors.push(cell.colors[y].slice(startX, endX).map((c) => [...c] as RGBA));
    }
  }
  let newTags: number[][] | null = null;
  if (cell._tags !== null) {
    newTags = [];
    for (let y = startY; y < endY; y++) {
      newTags.push(cell.tags[y].slice(startX, endX));
    }
  }
  return new Cell6d({ types: newTypes, colors: newColors, tags: newTags });
}
