import type { Pen, Point } from "mrly-draw";
import type { Color } from "mrly-draw/ink.ts";
import { Avatar, BIRD, PALETTE } from "../data/site/avatar.js";

type Box = { center: () => Point; radius: () => number };

const WIDTH = Avatar.width(BIRD) as number;
const BASE = Avatar.flatten(BIRD.outline.cubics, 3) as Point[];
const LIGHT = ((BIRD.fringe.angle as number) * Math.PI) / 180;
const FRINGE = BIRD.fringe.colors as string[];
const rgba = (hex: string): Color => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)).concat(255) as Color;
const RAINBOW = FRINGE.map((name) => rgba(Avatar.hexOf(PALETTE, name) as string));

export function bird(pen: Pen, box: Box, fill: Color, k = 1.1, fringe = true) {
  const [cx, cy] = box.center();
  const h = box.radius() * k;
  const at = (dx: number, dy: number): Point[] =>
    BASE.map(([x, y]) => [cx + dx + (x - WIDTH / 2) * h, cy + dy + (y - 0.5) * h]);
  const step = h * 0.018;
  if (fringe)
    for (let i = FRINGE.length - 1; i >= 0; i--)
      pen.polygon(at(-(i + 1) * step * Math.cos(LIGHT), (i + 1) * step * Math.sin(LIGHT)), RAINBOW[i]!);
  pen.polygon(at(0, 0), fill);
}

export function grid(pen: Pen, box: Box, rows: string[], fill: Color, gap = 0.12) {
  const [cx, cy] = box.center();
  const side = box.radius() * 1.3;
  const n = rows.length;
  const unit = side / n;
  for (const [r, row] of rows.entries())
    for (const [c, on] of [...row].entries()) {
      if (on !== "1") continue;
      const x = cx - side / 2 + c * unit + unit * gap * 0.5;
      const y = cy - side / 2 + r * unit + unit * gap * 0.5;
      pen.round_rect(x, y, unit * (1 - gap), unit * (1 - gap), unit * 0.18, fill);
    }
}
