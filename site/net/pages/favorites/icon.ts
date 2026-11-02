import { type Pen, type Point, plate } from "../../sdk.ts";

export const units = {};

const POINTS = 5;
const INNER = 0.42;

export default function draw(pen: Pen) {
  const { box, paint } = plate(pen, "yellow", 0.2);
  const [cx, cy] = box.center();
  const r = box.radius() * 0.95;
  const star: Point[] = Array.from({ length: POINTS * 2 }, (_, i) => {
    const a = -Math.PI / 2 + (i * Math.PI) / POINTS;
    const k = i % 2 ? r * INNER : r;
    return [cx + Math.cos(a) * k, cy + r * 0.06 + Math.sin(a) * k];
  });
  pen.polygon(star, paint.white);
}
