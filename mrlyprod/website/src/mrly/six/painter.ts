import type { Mode } from "../enums";
import type { PaletteMap } from "../two/models";
import { paint2d } from "../two/painter";
import type { Cell6d } from "./models";

export function paint6d(cell: Cell6d, palette?: PaletteMap, mode?: Mode): Cell6d {
  return paint2d(cell, palette, mode) as Cell6d;
}
