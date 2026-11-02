import { type Pen, plate } from "../../sdk.ts";

export const units = {};

const SUN = 0.2;
const RAYS = 12;
const PUFFS: [number, number, number][] = [
  [-0.32, 0.3, 0.2],
  [-0.08, 0.2, 0.28],
  [0.22, 0.26, 0.22],
  [0.42, 0.36, 0.14],
];

export default function draw(pen: Pen) {
  const { box, paint } = plate(pen, "cyan", 0.16);
  const [cx, cy] = box.center();
  const r = box.radius();
  const sx = cx + r * 0.28;
  const sy = cy - r * 0.3;
  for (let i = 0; i < RAYS; i++) {
    const a = (i / RAYS) * Math.PI * 2;
    const inner = r * SUN * 1.35;
    const outer = r * SUN * 1.8;
    pen.segment(
      [sx + Math.cos(a) * inner, sy + Math.sin(a) * inner],
      [sx + Math.cos(a) * outer, sy + Math.sin(a) * outer],
      r * 0.045,
      paint.light,
    );
  }
  pen.disc(sx, sy, r * SUN, [255, 214, 10, 255]);
  pen.round_rect(cx - r * 0.55, cy + r * 0.32, r * 1.1, r * 0.3, r * 0.15, paint.white);
  for (const [dx, dy, k] of PUFFS) pen.disc(cx + dx * r, cy + dy * r, k * r, paint.white);
}
