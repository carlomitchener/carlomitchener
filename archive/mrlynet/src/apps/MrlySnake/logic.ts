// TYPES

export type Point = { x: number; y: number };
export type Direction = "UP" | "DOWN" | "LEFT" | "RIGHT";

export interface SnakeSettings {
  tickMs: number;
  gridSize: number;
  apples: number;
  wrap: boolean;
}

// DEFAULTS

export const SNAKE_DEFAULTS: SnakeSettings = {
  tickMs: 150,
  gridSize: 16,
  apples: 1,
  wrap: true,
};

export const DIRS: Record<Direction, Point> = {
  UP: { x: 0, y: -1 },
  DOWN: { x: 0, y: 1 },
  LEFT: { x: -1, y: 0 },
  RIGHT: { x: 1, y: 0 },
};

// HELPERS

export function getRandomDirection(): Direction {
  const directions: Direction[] = ["UP", "DOWN", "LEFT", "RIGHT"];
  return directions[Math.floor(Math.random() * directions.length)];
}

export function createSnake(direction: Direction, gridSize: number): Point[] {
  const center = Math.floor(gridSize / 2);
  const head = { x: center, y: center };
  const opposite = DIRS[direction];
  const body = { x: center - opposite.x, y: center - opposite.y };
  return [head, body];
}

export function getRandomPos(exclude: Point[], gridSize: number): Point {
  let pos: Point;
  let valid = false;
  let attempts = 0;
  while (!valid && attempts < 100) {
    pos = {
      x: Math.floor(Math.random() * gridSize),
      y: Math.floor(Math.random() * gridSize),
    };
    const hit = exclude.some((s) => s.x === pos.x && s.y === pos.y);
    if (!hit) valid = true;
    attempts++;
  }
  return pos!;
}

export function moveSnake(
  snake: Point[],
  dir: Direction,
  foods: Point[],
  gridSize: number,
  wrap: boolean
): { snake: Point[]; ateIndex: number; dead: boolean } {
  const s = [...snake];
  const head = { ...s[0] };
  const d = DIRS[dir];
  head.x += d.x;
  head.y += d.y;
  if (wrap) {
    if (head.x < 0) head.x = gridSize - 1;
    else if (head.x >= gridSize) head.x = 0;
    if (head.y < 0) head.y = gridSize - 1;
    else if (head.y >= gridSize) head.y = 0;
  } else if (head.x < 0 || head.x >= gridSize || head.y < 0 || head.y >= gridSize) {
    return { snake: s, ateIndex: -1, dead: true };
  }
  const ateIndex = foods.findIndex((f) => f.x === head.x && f.y === head.y);
  const ate = ateIndex >= 0;
  const bodyToCheck = ate ? s : s.slice(0, -1);
  const dead = bodyToCheck.some((seg) => seg.x === head.x && seg.y === head.y);
  s.unshift(head);
  if (!ate) {
    s.pop();
  }
  return { snake: s, ateIndex: dead ? -1 : ateIndex, dead };
}

export function getDir(seg: Point, neighbor: Point) {
  const dx = neighbor.x - seg.x;
  const dy = neighbor.y - seg.y;
  return {
    right: dx === 1 || dx < -1,
    left: dx === -1 || dx > 1,
    down: dy === 1 || dy < -1,
    up: dy === -1 || dy > 1,
  };
}

export function getBorderRadius(snake: Point[], seg: Point, i: number): string {
  const isHead = i === 0;
  const isTail = i === snake.length - 1;
  if (isHead || isTail) {
    const neighbor = isHead ? snake[1] : snake[i - 1];
    if (neighbor) {
      const d = getDir(seg, neighbor);
      if (d.right) return "50% 0 0 50%";
      if (d.left) return "0 50% 50% 0";
      if (d.down) return "50% 50% 0 0";
      if (d.up) return "0 0 50% 50%";
    }
  } else {
    const prev = snake[i - 1];
    const next = snake[i + 1];
    if (prev && next) {
      const d1 = getDir(seg, prev);
      const d2 = getDir(seg, next);
      const isRight = d1.right || d2.right;
      const isLeft = d1.left || d2.left;
      const isUp = d1.up || d2.up;
      const isDown = d1.down || d2.down;
      if (isUp && isRight) return "0 0 0 50%";
      if (isUp && isLeft) return "0 0 50% 0";
      if (isDown && isRight) return "50% 0 0 0";
      if (isDown && isLeft) return "0 50% 0 0";
    }
  }
  return "0";
}
