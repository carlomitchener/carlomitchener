import {
  carpetFillSquares,
  carpetVoidSquares,
  gridSquares,
  netFillSquares,
  netVoidSquares,
  treeFillSquares,
  treeVoidSquares,
  voidFillSquares,
  voidVoidSquares,
} from "../formulas";

export type SequenceId =
  | "all"
  | "none"
  | "evens"
  | "odds"
  | "primes"
  | "binary"
  | "fibonacci"
  | "gridSquares"
  | "carpetFill"
  | "carpetVoid"
  | "netFill"
  | "netVoid"
  | "treeFill"
  | "treeVoid"
  | "voidFill"
  | "voidVoid";

export interface SequenceDef {
  id: SequenceId;
  label: string;
  generate: (limit: number) => number[];
}

// PRIMARIES

function evens(limit: number): number[] {
  const out: number[] = [];
  for (let i = 0; i <= limit; i += 2) out.push(i);
  return out;
}

function odds(limit: number): number[] {
  const out: number[] = [];
  for (let i = 1; i <= limit; i += 2) out.push(i);
  return out;
}

function all(limit: number): number[] {
  const out: number[] = [];
  for (let i = 0; i <= limit; i++) out.push(i);
  return out;
}

function none(): number[] {
  return [];
}

function primes(limit: number): number[] {
  if (limit < 2) return [];
  const out: number[] = [2];
  for (let i = 3; i <= limit; i += 2) {
    let prime = true;
    for (let j = 3; j * j <= i; j += 2) {
      if (i % j === 0) { prime = false; break; }
    }
    if (prime) out.push(i);
  }
  return out;
}

function binary(limit: number): number[] {
  const out: number[] = [];
  let n = 0;
  while (true) {
    const v = 2 ** n;
    if (v > limit) break;
    out.push(v);
    n++;
  }
  return out;
}

function fibonacci(limit: number): number[] {
  const out: number[] = [];
  let a = 0;
  let b = 1;
  while (a <= limit) {
    out.push(a);
    [a, b] = [b, a + b];
  }
  return Array.from(new Set(out)).sort((x, y) => x - y);
}

// MRLY SQUARES

function mrlySequence(limit: number, generator: (n: number, l: number) => number): number[] {
  const out: number[] = [];
  let number = 1;
  let level = 1;
  while (true) {
    const v = generator(number, level);
    if (v > limit) break;
    out.push(v);
    number += 2;
  }
  return Array.from(new Set(out)).sort((x, y) => x - y);
}

// REGISTRY

export const SEQUENCES: SequenceDef[] = [
  { id: "all", label: "all", generate: all },
  { id: "none", label: "none", generate: none },
  { id: "evens", label: "evens", generate: evens },
  { id: "odds", label: "odds", generate: odds },
  { id: "primes", label: "primes", generate: primes },
  { id: "binary", label: "binary", generate: binary },
  { id: "fibonacci", label: "fibonacci", generate: fibonacci },
  { id: "gridSquares", label: "grid sq", generate: (l) => mrlySequence(l, gridSquares) },
  { id: "carpetFill", label: "carpet fills", generate: (l) => mrlySequence(l, carpetFillSquares) },
  { id: "carpetVoid", label: "carpet voids", generate: (l) => mrlySequence(l, carpetVoidSquares) },
  { id: "netFill", label: "net fills", generate: (l) => mrlySequence(l, netFillSquares) },
  { id: "netVoid", label: "net voids", generate: (l) => mrlySequence(l, netVoidSquares) },
  { id: "treeFill", label: "tree fills", generate: (l) => mrlySequence(l, treeFillSquares) },
  { id: "treeVoid", label: "tree voids", generate: (l) => mrlySequence(l, treeVoidSquares) },
  { id: "voidFill", label: "void fills", generate: (l) => mrlySequence(l, voidFillSquares) },
  { id: "voidVoid", label: "void voids", generate: (l) => mrlySequence(l, voidVoidSquares) },
];

export function getSequence(id: SequenceId): SequenceDef {
  const found = SEQUENCES.find((s) => s.id === id);
  if (!found) throw new Error(`Unknown sequence: ${id}`);
  return found;
}

export function resolveCounts(id: SequenceId, maxNeighbors: number, includeZeros: boolean, includeOnes: boolean): number[] {
  const raw = getSequence(id).generate(maxNeighbors);
  return raw.filter((x) => (x !== 0 || includeZeros) && (x !== 1 || includeOnes));
}
