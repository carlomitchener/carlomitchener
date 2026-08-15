// CONFIG

export const GRID_SIZE = 4;

// TYPES

export interface Tile {
  id: number;
  val: number;
  isNew?: boolean;
  isMerged?: boolean;
}

export type Grid = (Tile | null)[][];
export type Direction = "UP" | "DOWN" | "LEFT" | "RIGHT";

// HELPERS

export function getEmptyCells(grid: Grid) {
  const cells: { r: number; c: number }[] = [];
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      if (grid[r][c] === null) cells.push({ r, c });
    }
  }
  return cells;
}

export function spawnTile(grid: Grid, getNextId: () => number): Grid {
  const empty = getEmptyCells(grid);
  if (empty.length === 0) return grid;
  const { r, c } = empty[Math.floor(Math.random() * empty.length)];
  const newGrid = grid.map((row) => [...row]);
  newGrid[r][c] = {
    id: getNextId(),
    val: Math.random() < 0.9 ? 2 : 4,
    isNew: true,
  };
  return newGrid;
}

function compress(row: (Tile | null)[]): Tile[] {
  return row.filter((t): t is Tile => t !== null).map((t) => ({ ...t, isNew: false, isMerged: false }));
}

function merge(row: Tile[], getNextId: () => number): { row: (Tile | null)[]; score: number } {
  const newRow: (Tile | null)[] = [...row];
  let score = 0;
  const result: Tile[] = [];
  let skip = false;
  for (let i = 0; i < newRow.length; i++) {
    if (skip) {
      skip = false;
      continue;
    }
    const current = newRow[i] as Tile;
    const next = newRow[i + 1] as Tile | undefined;
    if (next && current.val === next.val) {
      const newVal = current.val * 2;
      result.push({
        id: getNextId(),
        val: newVal,
        isMerged: true,
        isNew: false,
      });
      score += newVal;
      skip = true;
    } else {
      result.push(current);
    }
  }
  const padded = [...result, ...Array(GRID_SIZE - result.length).fill(null)];
  return { row: padded, score };
}

function moveLeft(grid: Grid, getNextId: () => number): { grid: Grid; score: number; changed: boolean } {
  const newGrid: Grid = [];
  let totalScore = 0;
  let changed = false;
  for (let r = 0; r < GRID_SIZE; r++) {
    const row = grid[r];
    const compressed = compress(row);
    const merged = merge(compressed, getNextId);
    const finalRow = merged.row;
    newGrid.push(finalRow);
    totalScore += merged.score;
    if (JSON.stringify(row) !== JSON.stringify(finalRow)) {
      changed = true;
    }
  }
  return { grid: newGrid, score: totalScore, changed };
}

function rotateRight(grid: Grid): Grid {
  return grid.map((_, i) => grid.map((row) => row[i]).reverse());
}

export function moveGrid(
  grid: Grid,
  direction: Direction,
  getNextId: () => number
): { grid: Grid; score: number; changed: boolean } {
  let tempGrid = [...grid];
  let rotations = 0;
  if (direction === "UP") rotations = 3;
  if (direction === "RIGHT") rotations = 2;
  if (direction === "DOWN") rotations = 1;
  if (direction === "LEFT") rotations = 0;
  for (let i = 0; i < rotations; i++) tempGrid = rotateRight(tempGrid);
  const result = moveLeft(tempGrid, getNextId);
  tempGrid = result.grid;
  for (let i = 0; i < (4 - rotations) % 4; i++) tempGrid = rotateRight(tempGrid);
  return { grid: tempGrid, score: result.score, changed: result.changed };
}

export function checkGameOver(grid: Grid): boolean {
  if (getEmptyCells(grid).length > 0) return false;
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      const t = grid[r][c];
      if (!t) return false;
      const right = c < GRID_SIZE - 1 ? grid[r][c + 1] : null;
      const down = r < GRID_SIZE - 1 ? grid[r + 1][c] : null;
      if (right && right.val === t.val) return false;
      if (down && down.val === t.val) return false;
    }
  }
  return true;
}
