// CONFIG

export const GRID_1 = `
00000400000
03222222230
02020002020
02222222220
02020202020
42022122024
02020202020
02222222220
02020002020
03222222230
00000400000
`;

export const GRID_2 = `
00000400000
03222222230
02002020020
02022222020
02220202220
42022122024
02220202220
02022222020
02002020020
03222222230
00000400000
`;

export const GRID_3 = `
00000400000
03222222230
02020202020
02222222220
02020202020
42222122224
02020202020
02222222220
02020202020
03222222230
00000400000
`;

export const GRIDS = [GRID_1, GRID_2, GRID_3];
export const GRID_SIZE = 11;
export const TICK_MS = 150;
export const GHOST_MOVE_RATIO = 2;
export const FREEZE_DURATION = 1000;

export const TILE_TYPE = {
  WALL: 0,
  START: 1,
  FLOOR: 2,
  GHOST: 3,
  DOOR: 4,
} as const;

// TYPES

export type Point = { x: number; y: number };
export type Direction = "UP" | "DOWN" | "LEFT" | "RIGHT" | "IDLE";
export type FreezeMode = "none" | "win" | "lose";

export const DIRS: Record<Direction, Point> = {
  UP: { x: 0, y: -1 },
  DOWN: { x: 0, y: 1 },
  LEFT: { x: -1, y: 0 },
  RIGHT: { x: 1, y: 0 },
  IDLE: { x: 0, y: 0 },
};

// HELPERS

export function parseGrid(layout: string): number[][] {
  return layout
    .trim()
    .split("\n")
    .map((row) => row.trim().split("").map(Number));
}

export function randomDir(): Direction {
  return ["UP", "DOWN", "LEFT", "RIGHT"][Math.floor(Math.random() * 4)] as Direction;
}

export function calculateDistanceMap(
  targetX: number,
  targetY: number,
  isWalkable: (x: number, y: number) => boolean
): number[][] {
  const dist = Array(GRID_SIZE)
    .fill(null)
    .map(() => Array(GRID_SIZE).fill(Infinity));
  const queue: { x: number; y: number; d: number }[] = [{ x: targetX, y: targetY, d: 0 }];
  dist[targetY][targetX] = 0;
  let head = 0;
  while (head < queue.length) {
    const { x, y, d } = queue[head++];
    const moves: Direction[] = ["UP", "DOWN", "LEFT", "RIGHT"];
    for (const dir of moves) {
      const nx = x + DIRS[dir].x;
      const ny = y + DIRS[dir].y;
      if (isWalkable(nx, ny) && dist[ny][nx] === Infinity) {
        dist[ny][nx] = d + 1;
        queue.push({ x: nx, y: ny, d: d + 1 });
      }
    }
  }
  return dist;
}

export function getOptimalRandomMove(
  ghostX: number,
  ghostY: number,
  targetX: number,
  targetY: number,
  isWalkable: (x: number, y: number) => boolean
): Direction {
  const distMap = calculateDistanceMap(targetX, targetY, isWalkable);
  const currentDist = distMap[ghostY][ghostX];
  if (currentDist === Infinity) return "IDLE";
  const moves: Direction[] = ["UP", "DOWN", "LEFT", "RIGHT"];
  const optimalMoves: Direction[] = [];
  let minNeighborDist = Infinity;
  for (const d of moves) {
    const nx = ghostX + DIRS[d].x;
    const ny = ghostY + DIRS[d].y;
    if (nx >= 0 && nx < GRID_SIZE && ny >= 0 && ny < GRID_SIZE) {
      const dVal = distMap[ny][nx];
      if (dVal < minNeighborDist) {
        minNeighborDist = dVal;
      }
    }
  }
  for (const d of moves) {
    const nx = ghostX + DIRS[d].x;
    const ny = ghostY + DIRS[d].y;
    if (nx >= 0 && nx < GRID_SIZE && ny >= 0 && ny < GRID_SIZE) {
      if (distMap[ny][nx] === minNeighborDist) {
        optimalMoves.push(d);
      }
    }
  }
  if (optimalMoves.length > 0) {
    return optimalMoves[Math.floor(Math.random() * optimalMoves.length)];
  }
  return "IDLE";
}

export function getMoveTarget(x: number, y: number, dir: Direction): Point {
  return { x: x + DIRS[dir].x, y: y + DIRS[dir].y };
}
