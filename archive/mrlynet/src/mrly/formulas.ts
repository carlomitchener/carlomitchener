import * as binary from "./binary";

// GRID

export function gridLines(number: number, level: number): number {
  return number ** level;
}

export function gridSquares(number: number, level: number): number {
  return (number ** 2) ** level;
}

export function gridCubes(number: number, level: number): number {
  return (number ** 3) ** level;
}

// CARPET

export function carpetFillSquares(number: number, level: number): number {
  return (number ** 2 - Math.floor(number / 2) ** 2) ** level;
}

export function carpetVoidSquares(number: number, level: number): number {
  return gridSquares(number, level) - carpetFillSquares(number, level);
}

export function carpetFillCubes(number: number, level: number): number {
  const E = Math.ceil(number / 2);
  const O = Math.floor(number / 2);
  return (E ** 3 + 3 * O * E ** 2) ** level;
}

export function carpetVoidCubes(number: number, level: number): number {
  return gridCubes(number, level) - carpetFillCubes(number, level);
}

// NET

export function netFillSquares(number: number, level: number): number {
  return (number ** 2 - Math.floor((number + 1) / 2) ** 2) ** level;
}

export function netVoidSquares(number: number, level: number): number {
  return gridSquares(number, level) - netFillSquares(number, level);
}

export function netFillCubes(number: number, level: number): number {
  const E = Math.ceil(number / 2);
  const O = Math.floor(number / 2);
  return (O ** 3 + 3 * E * O ** 2) ** level;
}

export function netVoidCubes(number: number, level: number): number {
  return gridCubes(number, level) - netFillCubes(number, level);
}

// TREE

export function treeFillSquares(number: number, level: number): number {
  return (number * Math.floor((number + 1) / 2)) ** level;
}

export function treeVoidSquares(number: number, level: number): number {
  return gridSquares(number, level) - treeFillSquares(number, level);
}

export function treeFillCubes(number: number, level: number): number {
  return (number * Math.ceil(number / 2) ** 2) ** level;
}

export function treeVoidCubes(number: number, level: number): number {
  return gridCubes(number, level) - treeFillCubes(number, level);
}

// VOID

export function voidFillSquares(number: number, level: number): number {
  return Math.ceil(number ** 2 / 2) ** level;
}

export function voidVoidSquares(number: number, level: number): number {
  return gridSquares(number, level) - voidFillSquares(number, level);
}

export function voidFillCubes(number: number, level: number): number {
  const E = Math.ceil(number / 2);
  const O = Math.floor(number / 2);
  return (E ** 3 + O ** 3) ** level;
}

export function voidVoidCubes(number: number, level: number): number {
  return gridCubes(number, level) - voidFillCubes(number, level);
}

// RATIOS

export function carpetRatio2d(number: number, level: number): number {
  return carpetFillSquares(number, level) / gridSquares(number, level);
}

export function carpetRatio3d(number: number, level: number): number {
  return carpetFillCubes(number, level) / gridCubes(number, level);
}

export function netRatio2d(number: number, level: number): number {
  return netFillSquares(number, level) / gridSquares(number, level);
}

export function netRatio3d(number: number, level: number): number {
  return netFillCubes(number, level) / gridCubes(number, level);
}

export function treeRatio2d(number: number, level: number): number {
  return treeFillSquares(number, level) / gridSquares(number, level);
}

export function treeRatio3d(number: number, level: number): number {
  return treeFillCubes(number, level) / gridCubes(number, level);
}

export function voidRatio2d(number: number, level: number): number {
  return voidFillSquares(number, level) / gridSquares(number, level);
}

export function voidRatio3d(number: number, level: number): number {
  return voidFillCubes(number, level) / gridCubes(number, level);
}

// DIMENSIONS

function sumGrid2d(grid: number[][]): number {
  let total = 0;
  for (const row of grid) {
    for (const v of row) total += v;
  }
  return total;
}

function sumGrid3d(grid: number[][][]): number {
  let total = 0;
  for (const layer of grid) {
    for (const row of layer) {
      for (const v of row) total += v;
    }
  }
  return total;
}

function calculateDimension2d(design: (n: number) => number[][], number: number): number {
  if (number === 1) return 2;
  const grid = design(number);
  const fill = sumGrid2d(grid);
  if (fill <= 0) return 0;
  return Math.log(fill) / Math.log(number);
}

function calculateDimension3d(design: (n: number) => number[][][], number: number): number {
  if (number === 1) return 3;
  const grid = design(number);
  const fill = sumGrid3d(grid);
  if (fill <= 0) return 0;
  return Math.log(fill) / Math.log(number);
}

export function carpet2dDimension(number: number): number {
  return calculateDimension2d(binary.carpet2d, number);
}

export function carpet3dDimension(number: number): number {
  return calculateDimension3d(binary.carpet3d, number);
}

export function net2dDimension(number: number): number {
  return calculateDimension2d(binary.net2d, number);
}

export function net3dDimension(number: number): number {
  return calculateDimension3d(binary.net3d, number);
}

export function tree2dDimension(number: number): number {
  return calculateDimension2d(binary.tree2d, number);
}

export function tree3dDimension(number: number): number {
  return calculateDimension3d(binary.tree3d, number);
}

export function void2dDimension(number: number): number {
  return calculateDimension2d(binary.void2d, number);
}

export function void3dDimension(number: number): number {
  return calculateDimension3d(binary.void3d, number);
}

// TRIANGLES

const fillDiagCache: Record<string, number[]> = {};
const totalDiagCache: Record<number, number[]> = {};

function fillByDiag(grid: number[][][], n: number): number[] {
  const maxD = 3 * (n - 1);
  const f = new Array(maxD + 1).fill(0);
  for (let z = 0; z < n; z++) {
    for (let y = 0; y < n; y++) {
      for (let x = 0; x < n; x++) {
        if (grid[z][y][x]) f[x + y + z] += 1;
      }
    }
  }
  return f;
}

function totalByDiag(n: number): number[] {
  if (totalDiagCache[n]) return totalDiagCache[n];
  const maxD = 3 * (n - 1);
  const t = new Array(maxD + 1).fill(0);
  for (let z = 0; z < n; z++) {
    for (let y = 0; y < n; y++) {
      for (let x = 0; x < n; x++) {
        t[x + y + z] += 1;
      }
    }
  }
  totalDiagCache[n] = t;
  return t;
}

function diagConvolve(fPrev: number[], fBase: number[], n: number): number[] {
  const lenPrev = fPrev.length;
  const lenBase = fBase.length;
  const maxS = n * (lenPrev - 1) + (lenBase - 1);
  const fNew = new Array(maxS + 1).fill(0);
  for (let a = 0; a < lenPrev; a++) {
    if (fPrev[a] === 0) continue;
    for (let b = 0; b < lenBase; b++) {
      if (fBase[b] === 0) continue;
      fNew[n * a + b] += fPrev[a] * fBase[b];
    }
  }
  return fNew;
}

function visitedDiags(m: number): { diags: number[]; weights: number[] } {
  const k = Math.floor((3 * (4 * m - 1)) / 2);
  const d = Math.floor(k / 4);
  if (m % 2 === 0) return { diags: [d - 1, d], weights: [4, 4] };
  return { diags: [d - 2, d - 1, d], weights: [1, 6, 1] };
}

function cutCounts(
  designFn: (n: number) => number[][][],
  number: number,
  level: number
): { fill: number; void: number } {
  const key = `${designFn.name}_${number}`;
  if (!fillDiagCache[key]) fillDiagCache[key] = fillByDiag(designFn(number), number);
  const fBase = fillDiagCache[key];
  const tBase = totalByDiag(number);
  let fCur = [...fBase];
  let tCur = [...tBase];
  for (let i = 1; i < level; i++) {
    fCur = diagConvolve(fCur, fBase, number);
    tCur = diagConvolve(tCur, tBase, number);
  }
  const m = number ** level;
  const { diags, weights } = visitedDiags(m);
  let fill = 0;
  let total = 0;
  for (let i = 0; i < diags.length; i++) {
    const d = diags[i];
    const w = weights[i];
    if (d < fCur.length) fill += w * fCur[d];
    if (d < tCur.length) total += w * tCur[d];
  }
  return { fill, void: total - fill };
}

export function gridTriangles(number: number, level: number): number {
  return 6 * number ** (2 * level);
}

export function carpetFillTriangles(number: number, level: number): number {
  return cutCounts(binary.carpet3d, number, level).fill;
}

export function carpetVoidTriangles(number: number, level: number): number {
  return cutCounts(binary.carpet3d, number, level).void;
}

export function netFillTriangles(number: number, level: number): number {
  return cutCounts(binary.net3d, number, level).fill;
}

export function netVoidTriangles(number: number, level: number): number {
  return cutCounts(binary.net3d, number, level).void;
}

export function treeFillTriangles(number: number, level: number): number {
  return cutCounts(binary.tree3d, number, level).fill;
}

export function treeVoidTriangles(number: number, level: number): number {
  return cutCounts(binary.tree3d, number, level).void;
}

export function voidFillTriangles(number: number, level: number): number {
  return cutCounts(binary.void3d, number, level).fill;
}

export function voidVoidTriangles(number: number, level: number): number {
  return cutCounts(binary.void3d, number, level).void;
}
