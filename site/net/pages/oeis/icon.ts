import { grid } from "../../figures.ts";
import { type Pen, plate } from "../../sdk.ts";

export const units = {};

export default function draw(pen: Pen) {
  const { box, paint } = plate(pen, "green", 0.2);
  grid(pen, box, ["00001", "00011", "00101", "01111", "10001"], paint.white);
}
