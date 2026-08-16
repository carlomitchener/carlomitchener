import { state } from "./state";

// HELPERS

function make2d(n: number, fill: number): number[][] {
  const grid: number[][] = [];
  for (let y = 0; y < n; y++) {
    const row: number[] = [];
    for (let x = 0; x < n; x++) row.push(fill);
    grid.push(row);
  }
  return grid;
}

function make3d(n: number, fill: number): number[][][] {
  const grid: number[][][] = [];
  for (let z = 0; z < n; z++) {
    const layer: number[][] = [];
    for (let y = 0; y < n; y++) {
      const row: number[] = [];
      for (let x = 0; x < n; x++) row.push(fill);
      layer.push(row);
    }
    grid.push(layer);
  }
  return grid;
}

// ZEROS

export function zeros2d(n: number): number[][] {
  return make2d(n, 0);
}

export function zeros3d(n: number): number[][][] {
  return make3d(n, 0);
}

// ONES

export function ones2d(n: number): number[][] {
  return make2d(n, 1);
}

export function ones3d(n: number): number[][][] {
  return make3d(n, 1);
}

// NOISE

export function noise2d(n: number, density: number = 0.5): number[][] {
  const grid: number[][] = [];
  for (let y = 0; y < n; y++) {
    const row: number[] = [];
    for (let x = 0; x < n; x++) {
      row.push(state.random() < density ? 1 : 0);
    }
    grid.push(row);
  }
  return grid;
}

export function noise3d(n: number, density: number = 0.5): number[][][] {
  const grid: number[][][] = [];
  for (let z = 0; z < n; z++) {
    const layer: number[][] = [];
    for (let y = 0; y < n; y++) {
      const row: number[] = [];
      for (let x = 0; x < n; x++) {
        row.push(state.random() < density ? 1 : 0);
      }
      layer.push(row);
    }
    grid.push(layer);
  }
  return grid;
}

// CARPET

export function carpet2d(n: number): number[][] {
  const grid: number[][] = [];
  for (let y = 0; y < n; y++) {
    const row: number[] = [];
    for (let x = 0; x < n; x++) {
      row.push(1 - (x % 2) * (y % 2));
    }
    grid.push(row);
  }
  return grid;
}

export function carpet3d(n: number): number[][][] {
  const grid: number[][][] = [];
  for (let z = 0; z < n; z++) {
    const layer: number[][] = [];
    for (let y = 0; y < n; y++) {
      const row: number[] = [];
      for (let x = 0; x < n; x++) {
        row.push((x % 2) + (y % 2) + (z % 2) <= 1 ? 1 : 0);
      }
      layer.push(row);
    }
    grid.push(layer);
  }
  return grid;
}

// NET

export function net2d(n: number): number[][] {
  const grid: number[][] = [];
  for (let y = 0; y < n; y++) {
    const row: number[] = [];
    for (let x = 0; x < n; x++) {
      row.push(1 - (1 - (x % 2)) * (1 - (y % 2)));
    }
    grid.push(row);
  }
  return grid;
}

export function net3d(n: number): number[][][] {
  const grid: number[][][] = [];
  for (let z = 0; z < n; z++) {
    const layer: number[][] = [];
    for (let y = 0; y < n; y++) {
      const row: number[] = [];
      for (let x = 0; x < n; x++) {
        row.push((x % 2) + (y % 2) + (z % 2) > 1 ? 1 : 0);
      }
      layer.push(row);
    }
    grid.push(layer);
  }
  return grid;
}

// TREE

export function tree2d(n: number): number[][] {
  const grid: number[][] = [];
  for (let y = 0; y < n; y++) {
    const row: number[] = [];
    for (let x = 0; x < n; x++) {
      row.push(y % 2 === 0 ? 1 : 0);
    }
    grid.push(row);
  }
  return grid;
}

export function tree3d(n: number): number[][][] {
  const grid: number[][][] = [];
  for (let z = 0; z < n; z++) {
    const layer: number[][] = [];
    for (let y = 0; y < n; y++) {
      const row: number[] = [];
      for (let x = 0; x < n; x++) {
        row.push(z % 2 === 0 && y % 2 === 0 ? 1 : 0);
      }
      layer.push(row);
    }
    grid.push(layer);
  }
  return grid;
}

// VOID

export function void2d(n: number): number[][] {
  const grid: number[][] = [];
  for (let y = 0; y < n; y++) {
    const row: number[] = [];
    for (let x = 0; x < n; x++) {
      row.push((x + y) % 2 === 0 ? 1 : 0);
    }
    grid.push(row);
  }
  return grid;
}

export function void3d(n: number): number[][][] {
  const grid: number[][][] = [];
  for (let z = 0; z < n; z++) {
    const layer: number[][] = [];
    for (let y = 0; y < n; y++) {
      const row: number[] = [];
      for (let x = 0; x < n; x++) {
        row.push(x % 2 === y % 2 && y % 2 === z % 2 ? 1 : 0);
      }
      layer.push(row);
    }
    grid.push(layer);
  }
  return grid;
}

// GEOMETRY

export function invert2d(grid: number[][]): number[][] {
  return grid.map((row) => row.map((v) => 1 - v));
}

export function invert3d(grid: number[][][]): number[][][] {
  return grid.map((layer) => layer.map((row) => row.map((v) => 1 - v)));
}

export function rotate2d(grid: number[][], k: number = 1): number[][] {
  k = ((k % 4) + 4) % 4;
  if (k === 0) return grid.map((r) => r.slice());
  let result = grid;
  for (let i = 0; i < k; i++) {
    const h = result.length;
    const w = result[0].length;
    const rotated: number[][] = [];
    for (let y = 0; y < w; y++) {
      const row: number[] = [];
      for (let x = 0; x < h; x++) {
        row.push(result[h - 1 - x][y]);
      }
      rotated.push(row);
    }
    result = rotated;
  }
  return result;
}

export function kron2d(a: number[][], b: number[][]): number[][] {
  const aH = a.length;
  const aW = a[0].length;
  const bH = b.length;
  const bW = b[0].length;
  const rH = aH * bH;
  const rW = aW * bW;
  const result: number[][] = [];
  for (let y = 0; y < rH; y++) {
    const row: number[] = [];
    for (let x = 0; x < rW; x++) {
      const ay = Math.floor(y / bH);
      const ax = Math.floor(x / bW);
      const by = y % bH;
      const bx = x % bW;
      row.push(a[ay][ax] * b[by][bx]);
    }
    result.push(row);
  }
  return result;
}

export function kron3d(a: number[][][], b: number[][][]): number[][][] {
  const aD = a.length;
  const aH = a[0].length;
  const aW = a[0][0].length;
  const bD = b.length;
  const bH = b[0].length;
  const bW = b[0][0].length;
  const rD = aD * bD;
  const rH = aH * bH;
  const rW = aW * bW;
  const result: number[][][] = [];
  for (let z = 0; z < rD; z++) {
    const layer: number[][] = [];
    for (let y = 0; y < rH; y++) {
      const row: number[] = [];
      for (let x = 0; x < rW; x++) {
        const az = Math.floor(z / bD);
        const ay = Math.floor(y / bH);
        const ax = Math.floor(x / bW);
        const bz = z % bD;
        const by = y % bH;
        const bx = x % bW;
        row.push(a[az][ay][ax] * b[bz][by][bx]);
      }
      layer.push(row);
    }
    result.push(layer);
  }
  return result;
}

export function fractal2d(grid: number[][], level: number): number[][] {
  if (level <= 1) return grid.map((r) => r.slice());
  let result = grid;
  for (let i = 1; i < level; i++) {
    result = kron2d(result, grid);
  }
  return result;
}

export function fractal3d(grid: number[][][], level: number): number[][][] {
  if (level <= 1) return grid.map((l) => l.map((r) => r.slice()));
  let result = grid;
  for (let i = 1; i < level; i++) {
    result = kron3d(result, grid);
  }
  return result;
}

export function magic2d(grids: number[][][]): number[][] {
  if (grids.length === 0) return [[]];
  let result: number[][] = grids[0];
  for (let i = 1; i < grids.length; i++) {
    result = kron2d(result, grids[i]);
  }
  return result;
}

export function magic3d(grids: number[][][][]): number[][][] {
  if (grids.length === 0) return [[[]]];
  let result: number[][][] = grids[0];
  for (let i = 1; i < grids.length; i++) {
    result = kron3d(result, grids[i]);
  }
  return result;
}
