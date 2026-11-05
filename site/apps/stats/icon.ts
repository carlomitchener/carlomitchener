import type { Pen } from "@mrlyprod/draw";
import { plate } from "@mrlyprod/draw/plate.ts";

export const units = {};

const HEIGHTS = [4, 7, 5, 10];
const SCALE = 10;
const AXIS = 0.085;
const GAP = 0.05;
const SPACE = 0.3;
const ROUND = 0.2;

export default function draw(pen: Pen) {
  const { box, paint } = plate(pen, "green", 0.18);
  for (const h of HEIGHTS)
    if (!Number.isInteger(h) || h < 1 || h > SCALE) throw new Error(`stats: bar ${h} is not 1 to ${SCALE}`);
  const tallest = HEIGHTS.indexOf(Math.max(...HEIGHTS));
  const t = box.w * AXIS;
  const g = box.w * GAP;
  const left = box.x + t + g;
  const right = box.x + box.w - t / 2;
  const floor = box.y + box.h - t / 2;
  const base = floor - t / 2 - g;
  const n = HEIGHTS.length;
  const bar = (right - left) / (n + (n - 1) * SPACE);
  const unit = (base - box.y) / SCALE;
  HEIGHTS.forEach((h, i) => {
    const x = left + i * bar * (1 + SPACE);
    pen.round_rect(x, base - h * unit, bar, h * unit, bar * ROUND, i === tallest ? paint.light : paint.white);
  });
  pen.polyline(
    [
      [box.x + t / 2, box.y + t / 2],
      [box.x + t / 2, floor],
      [right, floor],
    ],
    t,
    paint.white,
  );
}
