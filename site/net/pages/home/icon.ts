import { bird } from "../../figures.ts";
import { type Pen, plate } from "../../sdk.ts";

export const units = {};

export default function draw(pen: Pen) {
  const { box } = plate(pen, "gray", 0.18);
  bird(pen, box, [0, 0, 0, 255]);
}
