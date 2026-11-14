import { type Color, Grid, type Ink, type Pen } from "mrly-draw";

const P = 7;
const LEVEL = 6;
const SPAN = Math.floor((2 * P - 1) / 3) + 1;
const SIDE = SPAN ** (LEVEL / 2);
const LOW = Math.floor((P - 1) / 3);
const TOP = 3;
const BOTTOM = 1;
const REST = TOP - BOTTOM;
const NAME = "paper-digit-automaton-primes";

type Cell = { x: number; y: number; kind: number };

let memo: Cell[] | undefined;

function column([c, e]: [number, number], digit: number): [number, number] | undefined {
  const x = BOTTOM * digit + c;
  const y = REST * digit + e;
  return (x % P) + (y % P) < P ? [Math.floor(x / P), Math.floor(y / P)] : undefined;
}

function carry() {
  const states: [number, number][] = [];
  for (let c = 0; c < BOTTOM; c++) for (let e = 0; e < REST; e++) states.push([c, e]);
  const index = ([c, e]: [number, number]) => c * REST + e;
  const moves = states.map((state) =>
    Array.from({ length: P }, (_, d) => {
      const next = column(state, d);
      return next && index(next);
    }),
  );
  const closes = states.map((state) => {
    let at: [number, number] | undefined = state;
    while (at && (at[0] !== 0 || at[1] !== 0)) at = column(at, 0);
    return at !== undefined;
  });
  return { moves, closes };
}

function witness(moves: (number | undefined)[][], closes: boolean[]): [number, number] | undefined {
  const holds = (s: number | undefined) => s !== undefined && closes[s];
  for (let v = 0; v < P; v++) {
    if (!holds(moves[0][v])) continue;
    for (let u = 0; u < P; u++) {
      const s = moves[0][u];
      if (s === undefined || !closes[s]) continue;
      if (!holds(moves[s][v])) return [u, v * P];
    }
  }
}

function member(k: number, moves: (number | undefined)[][]) {
  let rest = k;
  let state = 0;
  for (;;) {
    const next = moves[state][rest % P];
    rest = Math.floor(rest / P);
    if (next === undefined) return false;
    if (rest === 0 && next === 0) return true;
    state = next;
  }
}

function count(moves: (number | undefined)[][], closes: boolean[]) {
  let words: number[] = moves.map((_, s) => (s === 0 ? 1 : 0));
  for (let i = 0; i < LEVEL; i++) {
    const next = new Array<number>(words.length).fill(0);
    words.forEach((n, s) => {
      for (const to of moves[s]) if (to !== undefined) next[to] += n;
    });
    words = next;
  }
  return words.reduce((sum, n, s) => (closes[s] ? sum + n : sum), 0);
}

function board() {
  if (memo) return memo;
  const { moves, closes } = carry();
  const fill = (P + 1) / 2;
  for (let s = 0; s < 2; s++) {
    const kept = moves[s].filter((to) => to !== undefined).length;
    if (kept !== fill) throw new Error(`${NAME}: state ${s} keeps ${kept} digits, want ${fill}`);
    for (let d = SPAN; d < P; d++)
      if (moves[s][d] !== undefined) throw new Error(`${NAME}: digit ${d} is allowed in state ${s}, the crop drops it`);
    for (let d = 0; d <= LOW; d++)
      if (s === 0 && moves[s][d] !== 0) throw new Error(`${NAME}: digit ${d} leaves state 0`);
  }
  const found = witness(moves, closes);
  if (found?.[0] !== 4 || found[1] !== 14) throw new Error(`${NAME}: witness ${found}, want 4 and 14`);
  const cells: Cell[] = [];
  let inK = 0;
  let design = 0;
  let endOne = 0;
  for (let y = 0; y < SIDE; y++) {
    for (let x = 0; x < SIDE; x++) {
      const digits: number[] = [];
      for (let i = 0; i < LEVEL / 2; i++)
        digits.push(Math.floor(x / SPAN ** i) % SPAN, Math.floor(y / SPAN ** i) % SPAN);
      let state: number | undefined = 0;
      for (const d of digits) {
        state = moves[state][d];
        if (state === undefined) break;
      }
      const k = digits.reduce((sum, d, i) => sum + d * P ** i, 0);
      const accepted = state !== undefined && closes[state];
      if (accepted !== member(k, moves)) throw new Error(`${NAME}: ${k} read ${accepted} against the crate`);
      if (!accepted) continue;
      inK++;
      const low = digits.every((d) => d <= LOW);
      if (low) design++;
      if (state === 1) endOne++;
      cells.push({ x, y, kind: low ? 0 : state === 1 ? 1 : 2 });
    }
  }
  const total = count(moves, closes);
  if (inK !== total || inK !== fill ** LEVEL)
    throw new Error(`${NAME}: ${inK} in K, want ${fill ** LEVEL} and the crate's ${total}`);
  if (design !== (LOW + 1) ** LEVEL) throw new Error(`${NAME}: ${design} in the design, want ${(LOW + 1) ** LEVEL}`);
  if (endOne !== (fill ** LEVEL - 1) / 3)
    throw new Error(`${NAME}: ${endOne} end in state 1, want ${(fill ** LEVEL - 1) / 3}`);
  memo = cells;
  return memo;
}

export default function draw(pen: Pen, ink: Ink) {
  const cells = board();
  const grid = new Grid(pen.frame(0.08), SIDE, SIDE, 0.14);
  const colors: Color[] = [ink.blue, ink.orange, ink.dim];
  for (const { x, y, kind } of cells) grid.fill(pen, x, SIDE - 1 - y, colors[kind]);
}
