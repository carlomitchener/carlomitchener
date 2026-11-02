import { bird } from "../../figures.ts";
import { type Pen, plate } from "../../sdk.ts";

export const units = {};

export default function draw(pen: Pen) {
  const { box, paint } = plate(pen, "indigo", 0.18);
  bird(pen, box, paint.white);
}
