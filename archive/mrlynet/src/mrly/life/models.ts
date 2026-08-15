import { Cell2d } from "../two/models";
import type { Fate } from "./enums";

export interface Life {
  grids: Cell2d[];
  fate: Fate;
  count: number;
  loop: number;
  time: number;
}
