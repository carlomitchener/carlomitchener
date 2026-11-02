import { grid } from "../../figures.ts";
import { type Pen, plate } from "../../sdk.ts";

export const units = {};

export default function draw(pen: Pen) {
  const { box, paint } = plate(pen, "orange", 0.2);
  grid(pen, box, ["11111", "10000", "10000", "10000", "11111"], paint.white);
}
