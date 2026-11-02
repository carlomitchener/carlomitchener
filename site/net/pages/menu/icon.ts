import { grid } from "../../figures.ts";
import { type Pen, plate } from "../../sdk.ts";

export const units = {};

export default function draw(pen: Pen) {
  const { box, paint } = plate(pen, "gray", 0.2);
  grid(pen, box, ["101", "000", "101"], paint.white, 0.1);
}
