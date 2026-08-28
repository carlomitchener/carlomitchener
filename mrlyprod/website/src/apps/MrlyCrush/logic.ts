import { getMrlyStyle, type TileStyle } from "../../components/MrlyTile";

// CONFIG

export const GRID_COLS = 9;
export const GRID_ROWS = 9;
export const BASE_FPS = 4;

// TYPES

export type TileData = TileStyle & {
  id: string;
  isCrushable?: boolean;
};

// HELPERS

export function getRandomTile(): TileData {
  const style = getMrlyStyle();
  return {
    ...style,
    id: Math.random().toString(36).substr(2, 9),
  };
}

export function canMove(x: number, y: number, grid: (TileData | null)[][]): boolean {
  if (x < 0 || x >= GRID_COLS || y >= GRID_ROWS) return false;
  if (y >= 0 && grid[y][x] !== null) return false;
  return true;
}

export function checkForMatches(currentGrid: (TileData | null)[][]) {
  let changed = false;
  const newGrid = currentGrid.map((row) => row.map((tile) => (tile ? { ...tile } : null)));
  const visited = new Set<string>();
  for (let y = 0; y < GRID_ROWS; y++) {
    for (let x = 0; x < GRID_COLS; x++) {
      const startKey = `${y},${x}`;
      const tile = newGrid[y][x];
      if (!tile || visited.has(startKey)) continue;
      const component: { r: number; c: number }[] = [];
      const queue: { r: number; c: number }[] = [{ r: y, c: x }];
      visited.add(startKey);
      component.push({ r: y, c: x });
      const targetDesign = tile.design;
      while (queue.length > 0) {
        const { r, c } = queue.shift()!;
        const neighbors = [
          { r: r - 1, c: c },
          { r: r + 1, c: c },
          { r: r, c: c - 1 },
          { r: r, c: c + 1 },
        ];
        for (const n of neighbors) {
          const nKey = `${n.r},${n.c}`;
          if (n.r >= 0 && n.r < GRID_ROWS && n.c >= 0 && n.c < GRID_COLS) {
            const neighborTile = newGrid[n.r][n.c];
            if (neighborTile && neighborTile.design === targetDesign && !visited.has(nKey)) {
              visited.add(nKey);
              component.push(n);
              queue.push(n);
            }
          }
        }
      }
      if (component.length >= 3) {
        for (const { r, c } of component) {
          if (!newGrid[r][c]!.isCrushable) {
            newGrid[r][c]!.isCrushable = true;
            changed = true;
          }
        }
      }
    }
  }
  return { grid: newGrid, changed };
}

export function crushAndGravity(grid: (TileData | null)[][]): { grid: (TileData | null)[][]; points: number } {
  const currentGrid = grid.map((row) => row.map((tile) => (tile ? { ...tile } : null)));
  let points = 0;
  let hasCrushed = false;
  for (let y = 0; y < GRID_ROWS; y++) {
    for (let x = 0; x < GRID_COLS; x++) {
      if (currentGrid[y][x]?.isCrushable) {
        currentGrid[y][x] = null;
        points++;
        hasCrushed = true;
      }
    }
  }
  if (!hasCrushed) return { grid, points: 0 };
  // GRAVITY
  for (let x = 0; x < GRID_COLS; x++) {
    let writeY = GRID_ROWS - 1;
    for (let y = GRID_ROWS - 1; y >= 0; y--) {
      if (currentGrid[y][x] !== null) {
        if (writeY !== y) {
          currentGrid[writeY][x] = currentGrid[y][x];
          currentGrid[y][x] = null;
        }
        writeY--;
      }
    }
  }
  const { grid: finalGrid } = checkForMatches(currentGrid);
  return { grid: finalGrid, points };
}
