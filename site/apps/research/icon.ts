import type { Pen, Point } from "@mrlyprod/draw";
import { frame, Grid } from "@mrlyprod/draw";
import { plate } from "@mrlyprod/draw/plate.ts";
import type { Cell } from "@mrlyprod/math";
import * as two from "@mrlyprod/two";

export const units = { two };

const CODE = 495;
const BASE = 3;
const LEVEL = 3;
const WANT = { side: 27, fills: 512 };
const ASPECT = 0.74;
const ROUND = 0.06;
const FOLD = 0.2;
const ARC = 4;

let memo: Cell | null = null;

function figure() {
  if (memo) return memo;
  const cells = two.create(CODE, BASE, LEVEL, 0, BASE);
  const side = cells.shape[1];
  const fills = two.fills(cells);
  if (side !== WANT.side || fills !== WANT.fills)
    throw new Error(
      `research: the carpet at level ${LEVEL} is ${side} a side with ${fills} fills, want ${WANT.side} and ${WANT.fills}`,
    );
  memo = cells;
  return memo;
}

function corner(cx: number, cy: number, r: number, from: number): Point[] {
  return Array.from({ length: ARC + 1 }, (_, i) => {
    const t = from + (i / ARC) * (Math.PI / 2);
    return [cx + r * Math.cos(t), cy + r * Math.sin(t)];
  });
}

export default function draw(pen: Pen) {
  const { box, paint } = plate(pen, "purple", 0.16);
  const h = box.h;
  const w = h * ASPECT;
  const x = box.x + (box.w - w) / 2;
  const y = box.y;
  const r = w * ROUND;
  const f = w * FOLD;
  const sheet: Point[] = [
    ...corner(x + r, y + r, r, Math.PI),
    [x + w - f, y],
    [x + w, y + f],
    ...corner(x + w - r, y + h - r, r, 0),
    ...corner(x + r, y + h - r, r, Math.PI / 2),
  ];
  pen.polygon(sheet, paint.white);
  pen.polygon(
    [
      [x + w - f, y],
      [x + w - f, y + f],
      [x + w, y + f],
    ],
    paint.light,
  );
  const pad = w * 0.16;
  const span = w - 2 * pad;
  const bar = w * 0.06;
  const gap = w * 0.08;
  const lines = [1, 0.64];
  const step = bar * 1.9;
  const content = bar + gap + span + gap + bar + step * (lines.length - 1);
  const head = y + (h - content) / 2;
  pen.round_rect(x + pad, head, w * 0.4, bar, bar / 2, paint.deep);
  const top = head + bar + gap;
  new Grid(frame(x + pad, top, span, span), WANT.side, WANT.side, 0).paint(pen, figure(), (kind) =>
    kind !== 0 ? paint.light : null,
  );
  lines.forEach((share, i) => {
    pen.round_rect(x + pad, top + span + gap + i * step, span * share, bar, bar / 2, paint.light);
  });
}
