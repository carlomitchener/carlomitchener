import { type Color, type Frame, frame, Grid, type Ink, type Pen, type Tensor } from "mrly-draw";
import * as math from "mrly-math/wasm";
import * as tensor from "mrly-tensor/wasm";
import { fill, magic, side as wordSide } from "../../shared/ts/word.ts";

export const units = { math, tensor };

const SIDE = 15;

function letters(first: [number, number], second: [number, number]) {
  return [first, second].map(([code, number]) => math.factory.MagicLayer.new(new math.name.Bang(code, 2, 2), number));
}

function panel(pen: Pen, box: Frame, cells: Tensor, color: Color) {
  new Grid(box, SIDE, SIDE, 0.09).paint(pen, cells, (kind) => (kind !== 0 ? color : null));
}

export default function draw(pen: Pen, ink: Ink) {
  const area = pen.frame(0.08);
  const gutter = area.w * 0.055;
  const side = (area.w - gutter) / 2;
  const top = area.y + (area.h - side) / 2;

  const forward = letters([7, 3], [14, 5]);
  const reverse = letters([14, 5], [7, 3]);
  if (wordSide(forward) !== BigInt(SIDE))
    throw new Error(`research-magic: forward side ${wordSide(forward)}, want ${SIDE}`);
  if (wordSide(reverse) !== BigInt(SIDE))
    throw new Error(`research-magic: reverse side ${wordSide(reverse)}, want ${SIDE}`);
  if (fill(forward) !== fill(reverse)) throw new Error("research-magic: the two orders fill differently");

  const left = magic(forward);
  const right = magic(reverse);
  for (const tensor of [left, right]) {
    if (
      tensor.shape.length !== 2 ||
      tensor.shape[0] !== SIDE ||
      tensor.shape[1] !== SIDE ||
      tensor.data.length !== SIDE * SIDE
    )
      throw new Error(`research-magic: a word is ${tensor.shape}, want ${SIDE} square`);
  }
  const sums = [0, 0];
  let differs = false;
  for (let i = 0; i < SIDE * SIDE; i++) {
    sums[0] += left.data[i];
    sums[1] += right.data[i];
    if (left.data[i] !== right.data[i]) differs = true;
  }
  if (sums[0] !== sums[1]) throw new Error(`research-magic: fills ${sums[0]} and ${sums[1]} differ`);
  if (!differs) throw new Error("research-magic: the two orders are the same word");

  panel(pen, frame(area.x, top, side, side), left, ink.blue);
  panel(pen, frame(area.x + side + gutter, top, side, side), right, ink.orange);
}
