import { Cell2d } from "../two/models";
import type { LifeConfig } from "./config";
import { Fate } from "./enums";
import type { Life } from "./models";
import { gridKey, gridsEqual, step } from "./step";

export function animate(config: LifeConfig, seed: Cell2d, mask: number[][]): Life {
  const grids: Cell2d[] = [seed.copy()];
  const history = new Map<string, number>();
  history.set(gridKey(seed.types), 0);
  let current = seed.copy();
  let fate: Fate | null = null;
  let loop = 0;
  const start = performance.now();
  let i = 0;
  for (i = 1; i < config.maxGenerations; i++) {
    const next = step(current, mask, config.birth, config.survive, config.boundary);
    if (gridsEqual(current.types, next.types)) {
      let pop = 0;
      for (const row of next.types) for (const v of row) pop += v;
      fate = pop === 0 ? Fate.DEAD : Fate.LIFE;
      break;
    }
    const key = gridKey(next.types);
    const prev = history.get(key);
    if (prev !== undefined) {
      loop = i - prev;
      fate = Fate.LOOP;
      break;
    }
    history.set(key, i);
    current = next;
    grids.push(current.copy());
  }
  if (!fate) fate = Fate.TIME;
  const time = (performance.now() - start) / 1000;
  return { grids, fate, count: grids.length, loop, time };
}
