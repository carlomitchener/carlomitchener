import type { Ink, Pen } from "mrly-draw";
import { field, frame } from "mrly-draw";
import * as num from "mrly-num/wasm";

export const units = { num };

const SCALES = 31;
const CELL = 28;

let memo: Float64Array | undefined;

function oddBlocks(span: number, block: number) {
  return block * Math.floor(span / (2 * block)) + Math.max((span % (2 * block)) - block, 0);
}

function overlap(m: number, n: number) {
  const grid = num.factor.lcm(m, n);
  const [a, b] = [grid / m, grid / n];
  let both = 0;
  for (let k = 1; k < n; k += 2) both += oddBlocks((k + 1) * b, a) - oddBlocks(k * b, a);
  return { both, grid };
}

function correlation(m: number, n: number) {
  const [hm, hn] = [Math.floor(m / 2), Math.floor(n / 2)];
  if (hm === 0 || hn === 0) return 0;
  const { both, grid } = overlap(m, n);
  const cross = both * m * n;
  const solo = hm * hn * grid;
  const gap = cross - solo;
  if (gap === 0) return 0;
  const scale = grid * m * n;
  const covariance = (gap / scale) * ((cross + solo) / scale);
  const variance = (half: number, side: number) => {
    const share = (half * half) / (side * side);
    return share * (1 - share);
  };
  return covariance / Math.sqrt(variance(hm, m) * variance(hn, n));
}

function values() {
  if (memo) return memo;
  const odds: number[] = [];
  for (let m = 3; m <= 63; m += 2) odds.push(m);
  if (odds.length !== SCALES)
    throw new Error(`paper-moire-correlation-laws: ${odds.length} odd scales, want ${SCALES}`);
  if (correlation(3, 5) !== 0)
    throw new Error(`paper-moire-correlation-laws: correlation(3, 5) is ${correlation(3, 5)}, want 0`);
  if (!(Math.abs(correlation(9, 9) - 1) < 1e-12))
    throw new Error(`paper-moire-correlation-laws: correlation(9, 9) is ${correlation(9, 9)}, want 1`);
  const grid = new Float64Array(SCALES * SCALES);
  let at = 0;
  for (const m of odds) {
    for (const n of odds) {
      const r = correlation(m, n);
      grid[at++] = r <= 0 ? 0 : 0.5 + 0.5 * Math.sqrt(r);
    }
  }
  const clear = grid.reduce((count, v) => count + (v === 0 ? 1 : 0), 0);
  if (clear !== 762) throw new Error(`paper-moire-correlation-laws: ${clear} clear pairs, want 762`);
  memo = grid;
  return memo;
}

export default function draw(pen: Pen, ink: Ink) {
  const ramp = new ink.Ramp([ink.ground, ink.blue, ink.yellow]);
  const side = CELL * SCALES;
  const edge = (pen.width - side) / 2;
  field.draw_range(pen, frame(edge, edge, side, side), SCALES, SCALES, values(), [0, 1], ramp);
}
