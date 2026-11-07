import type { Ink, Pen } from "@mrlyprod/draw";
import { hex as comb } from "@mrlyprod/draw";
import * as hex from "@mrlyprod/hex";

export const units = { hex };

const SIDE = 11;

type Slice = ReturnType<typeof hex.cut_design>;

let memo: { carpet: Slice; net: Slice } | undefined;

function slices() {
  if (memo) return memo;
  const carpet = hex.cut_design(23, SIDE, 1, 2);
  const net = hex.cut_design(232, SIDE, 1, 2);
  for (const cut of [carpet, net]) {
    const [height, width] = cut.cell.shape;
    if (height !== 2 * SIDE || width < comb.row_len(SIDE, SIDE - 1))
      throw new Error(`research-slices: the cut is ${height} by ${width}, want ${2 * SIDE} rows`);
  }
  const fills = [hex.fills(carpet), hex.fills(net)];
  if (fills[0] !== 486) throw new Error(`research-slices: the carpet holds ${fills[0]} fills, want 486`);
  if (fills[1] !== 240) throw new Error(`research-slices: the net holds ${fills[1]} fills, want 240`);
  if (hex.holes(carpet) !== 19)
    throw new Error(`research-slices: the carpet holds ${hex.holes(carpet)} holes, want 19`);
  if (fills[0] + fills[1] !== comb.count(SIDE))
    throw new Error(`research-slices: ${fills[0] + fills[1]} fills, want ${comb.count(SIDE)}`);
  memo = { carpet, net };
  return memo;
}

export default function draw(pen: Pen, ink: Ink) {
  const { carpet, net } = slices();
  const FILL = hex.FILL();
  comb.hexagon(pen, pen.frame(0.08), SIDE, 1.6, (row, col) => {
    if (comb.at(carpet, SIDE, row, col) === FILL) return ink.blue;
    if (comb.at(net, SIDE, row, col) === FILL) return ink.orange;
    return null;
  });
}
