import type { Ink, Pen } from "@mrlyprod/draw";
import { hex as comb } from "@mrlyprod/draw";
import * as hex from "@mrlyprod/hex";

export const units = { hex };

const SIDE = 7;

type Slice = ReturnType<typeof hex.cut_design>;

let memo: Slice | undefined;

function slice() {
  if (memo) return memo;
  const cut = hex.cut_design(105, SIDE, 1, 2);
  const [height, width] = cut.cell.shape;
  if (height !== 2 * SIDE || width < comb.row_len(SIDE, SIDE - 1))
    throw new Error(`paper-walsh-spectrometer: the cut is ${height} by ${width}, want ${2 * SIDE} rows`);
  if (comb.count(SIDE) !== 294)
    throw new Error(`paper-walsh-spectrometer: the hexagon holds ${comb.count(SIDE)} triangles, want 294`);
  if (hex.fills(cut) !== 72)
    throw new Error(`paper-walsh-spectrometer: the cut holds ${hex.fills(cut)} fills, want 72`);
  memo = cut;
  return memo;
}

export default function draw(pen: Pen, ink: Ink) {
  const cut = slice();
  const FILL = hex.FILL();
  const frame = pen.frame(0.08);
  comb.hexagon(pen, frame, SIDE, 0, () => ink.line);
  comb.hexagon(pen, frame, SIDE, 2.6, (row, col) => (comb.at(cut, SIDE, row, col) === FILL ? null : ink.ground));
  comb.hexagon(pen, frame, SIDE, 2.6, (row, col) => (comb.at(cut, SIDE, row, col) === FILL ? ink.blue : null));
}
