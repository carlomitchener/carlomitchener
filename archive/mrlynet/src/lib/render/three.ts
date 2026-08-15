import type { Cell3d } from "../../mrly/three/models";

// TEXT

export function text3d(grid: number[][][], mapping?: Record<number, string>): string[] {
  const rows: string[] = [];
  for (let z = 0; z < grid.length; z++) {
    for (let y = 0; y < grid[z].length; y++) {
      let rowStr = "";
      for (let x = 0; x < grid[z][y].length; x++) {
        const val = grid[z][y][x];
        rowStr += mapping ? (mapping[val] ?? String(val)) : String(val);
      }
      rows.push(rowStr);
    }
  }
  return rows;
}

// OBJ

export function toOBJ(cell: Cell3d): string {
  const grid = cell.types;
  const vertices: [number, number, number][] = [];
  const faces: [number, number, number, number][] = [];
  const vertexMap = new Map<string, number>();
  function addVertex(x: number, y: number, z: number): number {
    const key = `${x},${y},${z}`;
    if (!vertexMap.has(key)) {
      vertexMap.set(key, vertices.length + 1);
      vertices.push([x, y, z]);
    }
    return vertexMap.get(key)!;
  }
  const dimZ = grid.length;
  const dimY = grid[0].length;
  const dimX = grid[0][0].length;
  for (let i = 0; i < dimZ; i++) {
    for (let j = 0; j < dimY; j++) {
      for (let k = 0; k < dimX; k++) {
        if (grid[i][j][k] === 0) continue;

        if (i === 0 || grid[i - 1][j][k] === 0) {
          const v1 = addVertex(i, j, k);
          const v2 = addVertex(i, j, k + 1);
          const v3 = addVertex(i, j + 1, k + 1);
          const v4 = addVertex(i, j + 1, k);
          faces.push([v1, v2, v3, v4]);
        }

        if (i === dimZ - 1 || grid[i + 1][j][k] === 0) {
          const v1 = addVertex(i + 1, j, k);
          const v2 = addVertex(i + 1, j + 1, k);
          const v3 = addVertex(i + 1, j + 1, k + 1);
          const v4 = addVertex(i + 1, j, k + 1);
          faces.push([v1, v2, v3, v4]);
        }

        if (j === 0 || grid[i][j - 1][k] === 0) {
          const v1 = addVertex(i, j, k);
          const v2 = addVertex(i + 1, j, k);
          const v3 = addVertex(i + 1, j, k + 1);
          const v4 = addVertex(i, j, k + 1);
          faces.push([v1, v2, v3, v4]);
        }

        if (j === dimY - 1 || grid[i][j + 1][k] === 0) {
          const v1 = addVertex(i, j + 1, k);
          const v2 = addVertex(i, j + 1, k + 1);
          const v3 = addVertex(i + 1, j + 1, k + 1);
          const v4 = addVertex(i + 1, j + 1, k);
          faces.push([v1, v2, v3, v4]);
        }

        if (k === 0 || grid[i][j][k - 1] === 0) {
          const v1 = addVertex(i, j, k);
          const v2 = addVertex(i, j + 1, k);
          const v3 = addVertex(i + 1, j + 1, k);
          const v4 = addVertex(i + 1, j, k);
          faces.push([v1, v2, v3, v4]);
        }

        if (k === dimX - 1 || grid[i][j][k + 1] === 0) {
          const v1 = addVertex(i, j, k + 1);
          const v2 = addVertex(i + 1, j, k + 1);
          const v3 = addVertex(i + 1, j + 1, k + 1);
          const v4 = addVertex(i, j + 1, k + 1);
          faces.push([v1, v2, v3, v4]);
        }
      }
    }
  }

  const lines: string[] = [];
  for (const v of vertices) {
    lines.push(`v ${v[0]} ${v[1]} ${v[2]}`);
  }
  for (const f of faces) {
    lines.push(`f ${f[0]} ${f[1]} ${f[2]} ${f[3]}`);
  }
  return lines.join("\n");
}
