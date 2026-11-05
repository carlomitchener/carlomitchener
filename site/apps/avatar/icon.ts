import type { Pen } from "@mrlyprod/draw";
import { plate } from "@mrlyprod/draw/plate.ts";
import { bird } from "../../figures.ts";

export const units = {};

export default function draw(pen: Pen) {
  const { box, paint } = plate(pen, "indigo", 0.18);
  bird(pen, box, paint.white);
}
