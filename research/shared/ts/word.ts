import * as math from "mrly-math/wasm";
import * as tensor from "mrly-tensor/wasm";

export type Layer = math.factory.MagicLayer;

export type Letter = {
  fill: bigint;
  runsH: bigint;
  runsV: bigint;
  touchH: bigint;
  touchV: bigint;
  components: bigint;
};

export type Counts = { side: bigint; fill: bigint; components: bigint; runsH: bigint; runsV: bigint };

const LIMIT = 1n << 128n;

function tile(layer: Layer) {
  const { code, dim, base } = layer.design;
  return math.factory.create(code, layer.number, dim, base ?? 2, 1);
}

export function magic(layers: Layer[]) {
  if (layers.length < 2) throw new Error("magic needs at least two layers");
  const dim = layers[0].design.dim;
  if (layers.some((l) => l.design.dim !== dim)) throw new Error("magic layers must share one dimension");
  return layers.map(tile).reduce((out, next) => tensor.kron(out, next));
}

function pieces(rows: number, cols: number, on: (r: number, c: number) => boolean) {
  const seen = new Uint8Array(rows * cols);
  let count = 0n;
  for (let start = 0; start < rows * cols; start++) {
    if (seen[start] || !on(Math.floor(start / cols), start % cols)) continue;
    count++;
    seen[start] = 1;
    const stack = [start];
    while (stack.length) {
      const at = stack.pop() as number;
      const r = Math.floor(at / cols);
      const c = at % cols;
      for (const [nr, nc] of [
        [r - 1, c],
        [r + 1, c],
        [r, c - 1],
        [r, c + 1],
      ]) {
        if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue;
        const next = nr * cols + nc;
        if (!seen[next] && on(nr, nc)) {
          seen[next] = 1;
          stack.push(next);
        }
      }
    }
  }
  return count;
}

export function letter(layer: Layer): Letter {
  if (layer.design.dim !== 2) throw new Error("a letter's run and contact counts are a plane reading");
  const cells = tile(layer);
  const [rows, cols] = cells.shape;
  const on = (r: number, c: number) => cells.data[r * cols + c] !== 0;
  let [fill, runsH, runsV, touchH, touchV] = [0n, 0n, 0n, 0n, 0n];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (!on(r, c)) continue;
      fill++;
      if (c === 0 || !on(r, c - 1)) runsH++;
      if (r === 0 || !on(r - 1, c)) runsV++;
    }
    if (on(r, 0) && on(r, cols - 1)) touchH++;
  }
  for (let c = 0; c < cols; c++) if (on(0, c) && on(rows - 1, c)) touchV++;
  return { fill, runsH, runsV, touchH, touchV, components: pieces(rows, cols, on) };
}

function grow(state: Counts, side: bigint, read: Letter): Counts | undefined {
  const next: Counts = {
    side: state.side * side,
    fill: state.fill * read.fill,
    runsH: state.fill * (read.runsH - read.touchH) + state.runsH * read.touchH,
    runsV: state.fill * (read.runsV - read.touchV) + state.runsV * read.touchV,
    components:
      read.touchH === 0n && read.touchV === 0n
        ? state.fill * read.components
        : read.touchH === 0n
          ? state.runsV
          : read.touchV === 0n
            ? state.runsH
            : state.components,
  };
  return Object.values(next).some((v) => v >= LIMIT) ? undefined : next;
}

export function prefixes(layers: Layer[]) {
  let state: Counts = { side: 1n, fill: 1n, components: 1n, runsH: 1n, runsV: 1n };
  const out: Counts[] = [];
  for (const layer of layers) {
    const read = letter(layer);
    if (!(read.components === 1n || (read.touchH === 0n && read.touchV === 0n)))
      throw new Error(`letter c${layer.design.code} at side ${layer.number} has no closed component count`);
    const next = grow(state, BigInt(layer.number), read);
    if (!next) break;
    state = next;
    out.push(state);
  }
  return out;
}

export function components(layers: Layer[]) {
  const counts = prefixes(layers);
  if (counts.length < layers.length) throw new Error("the word's component count passes what a u128 holds");
  return counts[counts.length - 1].components;
}

export function side(layers: Layer[]) {
  return layers.reduce((out, layer) => out * BigInt(layer.number), 1n);
}

export function fill(layers: Layer[]) {
  return layers.reduce((out, layer) => out * BigInt(Array.from(tile(layer).data).reduce((sum, v) => sum + v, 0)), 1n);
}

export function constantFunctional(layers: Layer[]) {
  return layers.reduce((total, layer) => total + Math.log2(Number(letter(layer).components)), 0) / layers.length;
}

export function rates(layers: Layer[]): [number, number][] {
  return prefixes(layers).map((counts, index) => [
    Math.log2(Number(counts.components)) / (index + 1),
    Math.log2(Number(counts.fill)) / (index + 1),
  ]);
}
