import { getMrlyStyle, type TileStyle } from "../../components/MrlyTile";

// CONFIG

export const BOARD_SIZE = 18;
export const PADDLE_WIDTH = 5;
export const PADDLE_HEIGHT = 1;
export const PADDLE_Y = BOARD_SIZE - 1;
export const BALL_SIZE = 1;
export const BALL_SPEED = 1 / 3;
export const MAX_BOUNCE_ANGLE = 32;
export const BLOCK_WIDTH = 2;
export const BLOCK_HEIGHT = 1;
export const BLOCKS_PER_ROW = BOARD_SIZE / BLOCK_WIDTH;
export const INITIAL_ROWS = 4;
export const TICK_BASE_MAX = 12;
export const TICK_SCORE_DIVISOR = 20;
export const TICK_MIN = 4;
export const MIN_ROW_DENSITY = 1 / 2;
export const DEATH_ROW = PADDLE_Y - 1;
export const FPS = 32;
export const PADDLE_STEP = 1;
export const PADDLE_MIN_Y = Math.floor(BOARD_SIZE * 0.6);
export const PADDLE_MAX_Y = BOARD_SIZE - 1;

// TYPES

export type Block = {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  active: boolean;
  style: TileStyle;
};

export interface BallState {
  x: number;
  y: number;
  dx: number;
  dy: number;
  style: TileStyle;
}

export interface UpdateResult {
  ball: BallState;
  blocks: Block[];
  gameOver: boolean;
  bricksHit: number;
  soundEvents: number;
  paddleHit: boolean;
}

// HELPERS

export function getGameTileStyle(): TileStyle {
  return getMrlyStyle();
}

export function generatePaddleStyle(): TileStyle {
  return getMrlyStyle();
}

export function getNextTickThreshold(score: number): number {
  const base = Math.max(TICK_MIN, TICK_BASE_MAX - Math.floor(score / TICK_SCORE_DIVISOR));
  const jitter = Math.floor(Math.random() * 3) - 1;
  return Math.max(TICK_MIN, base + jitter);
}

export function generateRow(rowY: number, rowId: number): Block[] {
  const newRow: Block[] = [];
  for (let pos = 0; pos < BLOCKS_PER_ROW; pos++) {
    newRow.push({
      id: `r${rowId}-${pos}`,
      x: pos * BLOCK_WIDTH,
      y: rowY,
      width: BLOCK_WIDTH,
      height: BLOCK_HEIGHT,
      active: true,
      style: getGameTileStyle(),
    });
  }
  return newRow;
}

export function generatePartialRow(rowY: number, rowId: number): Block[] {
  const minBlocks = Math.ceil(BLOCKS_PER_ROW * MIN_ROW_DENSITY);
  const count = minBlocks + Math.floor(Math.random() * (BLOCKS_PER_ROW - minBlocks + 1));
  const positions = Array.from({ length: BLOCKS_PER_ROW }, (_, i) => i);
  for (let i = positions.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [positions[i], positions[j]] = [positions[j], positions[i]];
  }
  const selected = positions.slice(0, count).sort((a, b) => a - b);
  return selected.map((pos) => ({
    id: `r${rowId}-${pos}`,
    x: pos * BLOCK_WIDTH,
    y: rowY,
    width: BLOCK_WIDTH,
    height: BLOCK_HEIGHT,
    active: true,
    style: getGameTileStyle(),
  }));
}

export function tickBlocks(blocks: Block[]): Block[] {
  const active = blocks.filter((b) => b.active);
  const shifted = active.map((b) => ({ ...b, y: b.y + BLOCK_HEIGHT }));
  const minY = shifted.length > 0 ? Math.min(...shifted.map((b) => b.y)) : BLOCK_HEIGHT;
  const spawnY = minY - BLOCK_HEIGHT;
  const newRow = generatePartialRow(spawnY, Date.now());
  return [...newRow, ...shifted];
}

// PHYSICS

export function updateBall(ball: BallState, paddleX: number, paddleY: number, blocks: Block[]): UpdateResult {
  let { x, y, dx, dy } = ball;
  const { style } = ball;
  const prevX = x;
  const prevY = y;
  x += dx;
  y += dy;
  let soundEvents = 0;
  let bricksHit = 0;
  let paddleHit = false;
  const currentBlocks = blocks.map((b) => ({ ...b }));
  // WALL BOUNCE
  if (x <= 0) {
    dx = Math.abs(dx);
    x = 0;
    soundEvents++;
  } else if (x + BALL_SIZE >= BOARD_SIZE) {
    dx = -Math.abs(dx);
    x = BOARD_SIZE - BALL_SIZE;
    soundEvents++;
  }
  if (y <= 0) {
    dy = Math.abs(dy);
    y = 0;
    soundEvents++;
  }
  // PADDLE BOUNCE
  if (
    y + BALL_SIZE >= paddleY &&
    y < paddleY + PADDLE_HEIGHT &&
    x + BALL_SIZE > paddleX &&
    x < paddleX + PADDLE_WIDTH &&
    dy > 0
  ) {
    soundEvents++;
    paddleHit = true;
    const prevY_paddle = y - dy;
    const isTopHit = prevY_paddle + BALL_SIZE <= paddleY + Math.abs(dy) + 0.1;
    if (isTopHit) {
      const ballCenter = x + BALL_SIZE / 2;
      const paddleCenter = paddleX + PADDLE_WIDTH / 2;
      let hitPosition = (ballCenter - paddleCenter) / (PADDLE_WIDTH / 2);
      hitPosition = Math.max(-1, Math.min(1, hitPosition));
      const angleRad = hitPosition * ((MAX_BOUNCE_ANGLE * Math.PI) / 180);
      const accelerationFactor = 0.5;
      const newSpeed = BALL_SPEED * (1 + Math.abs(hitPosition) * accelerationFactor);
      dx = newSpeed * Math.sin(angleRad);
      dy = -newSpeed * Math.cos(angleRad);
      y = paddleY - BALL_SIZE;
    } else {
      const ballCenter = x + BALL_SIZE / 2;
      const paddleCenter = paddleX + PADDLE_WIDTH / 2;
      if (ballCenter < paddleCenter) {
        dx = -Math.abs(dx || BALL_SPEED);
      } else {
        dx = Math.abs(dx || BALL_SPEED);
      }
    }
  }
  // BLOCK COLLISION
  const activeBlocks = currentBlocks.filter((b) => b.active);
  let hitBlockIndex = -1;
  let closestDistSq = Infinity;
  for (let i = 0; i < activeBlocks.length; i++) {
    const block = activeBlocks[i];
    if (x < block.x + block.width && x + BALL_SIZE > block.x && y < block.y + block.height && y + BALL_SIZE > block.y) {
      const ballCenterPrevX = prevX + BALL_SIZE / 2;
      const ballCenterPrevY = prevY + BALL_SIZE / 2;
      const blockCenter = {
        x: block.x + block.width / 2,
        y: block.y + block.height / 2,
      };
      const distSq = Math.pow(ballCenterPrevX - blockCenter.x, 2) + Math.pow(ballCenterPrevY - blockCenter.y, 2);
      if (distSq < closestDistSq) {
        closestDistSq = distSq;
        hitBlockIndex = i;
      }
    }
  }
  if (hitBlockIndex !== -1) {
    const hitBlock = activeBlocks[hitBlockIndex];
    const realIndex = currentBlocks.indexOf(hitBlock);
    if (realIndex >= 0 && currentBlocks[realIndex].active) {
      currentBlocks[realIndex].active = false;
      bricksHit++;
      soundEvents++;
      const block = hitBlock;
      const py = prevY;
      const px = prevX;
      const bs = BALL_SIZE;
      const wasAbove = py + bs <= block.y + 0.05;
      const wasBelow = py >= block.y + block.height - 0.05;
      const wasLeft = px + bs <= block.x + 0.05;
      const wasRight = px >= block.x + block.width - 0.05;
      if (wasAbove && dy > 0) {
        dy = -dy;
        y = block.y - bs - 0.001;
      } else if (wasBelow && dy < 0) {
        dy = -dy;
        y = block.y + block.height + 0.001;
      } else if (wasLeft && dx > 0) {
        dx = -dx;
        x = block.x - bs - 0.001;
      } else if (wasRight && dx < 0) {
        dx = -dx;
        x = block.x + block.width + 0.001;
      } else {
        const centerX = x + bs / 2;
        const centerY = y + bs / 2;
        const bCx = block.x + block.width / 2;
        const bCy = block.y + block.height / 2;
        const ox = bs / 2 + block.width / 2 - Math.abs(centerX - bCx);
        const oy = bs / 2 + block.height / 2 - Math.abs(centerY - bCy);
        if (ox < oy) {
          dx = -dx;
          if (centerX < bCx) x = block.x - bs - 0.001;
          else x = block.x + block.width + 0.001;
        } else {
          dy = -dy;
          if (centerY < bCy) y = block.y - bs - 0.001;
          else y = block.y + block.height + 0.001;
        }
      }
    }
  }
  // GAME OVER
  const gameOver = y > BOARD_SIZE;
  return {
    ball: { x, y, dx, dy, style },
    blocks: currentBlocks,
    gameOver,
    bricksHit,
    soundEvents,
    paddleHit,
  };
}
