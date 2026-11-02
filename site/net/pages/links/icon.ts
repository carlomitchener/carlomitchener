import { type Pen, plate } from "../../sdk.ts";

export const units = {};

export default function draw(pen: Pen) {
  const { box, paint } = plate(pen, "teal", 0.2);
  const [cx, cy] = box.center();
  const r = box.radius();
  const d = r * 0.3;
  pen.ring(cx - d, cy, r * 0.42, r * 0.14, paint.white);
  pen.ring(cx + d, cy, r * 0.42, r * 0.14, paint.white);
}
