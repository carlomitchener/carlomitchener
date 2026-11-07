import type { Color, Ink, Pen, Point } from "mrly-draw";
import * as num from "mrly-num/wasm";

export const units = { num };

const QUARTIC = [1, -7833, 7916949, -850684437, 13054946580];
const PRINTED = {
  edge: 0.6402121937,
  cstar: 0.3597878062,
  supergolden: 0.6053028664,
  wall: 0.4479309878,
  rung: 0.4475978134,
};
const WORDS: [number, bigint][] = [
  [2, 45765225n],
  [3, 53582633n],
];

type Numbers = { phi: number; supergolden: number; edge: number; sgedge: number; rung: number };

let memo: Numbers | undefined;

function fail(what: string): never {
  throw new Error(`paper-lemma-b-pincer: ${what}`);
}

type Rule = { width: number; allowed: (bits: number) => boolean };

function rule(width: number, allowed: (bits: number) => boolean): Rule {
  return { width, allowed };
}

function transfer({ width, allowed }: Rule) {
  const states = 2 ** (width - 1);
  const matrix = Array.from({ length: states }, () => new Array<number>(states).fill(0));
  for (let s = 0; s < states; s++)
    for (let c = 0; c < 2; c++) {
      const window = s * 2 + c;
      if (allowed(window)) matrix[s][window % states]++;
    }
  return matrix;
}

function counts(r: Rule, level: number) {
  const matrix = transfer(r);
  let vector = matrix.map(() => 1n);
  for (let step = 0; step < level - r.width + 1; step++)
    vector = matrix.map((row) => row.reduce((sum, entry, t) => sum + BigInt(entry) * vector[t], 0n));
  return vector.reduce((sum, v) => sum + v, 0n);
}

function perron(r: Rule) {
  const matrix = transfer(r);
  const n = matrix.length;
  let vector = new Array<number>(n).fill(1 / n);
  for (let sweep = 0; sweep < 100000; sweep++) {
    const next = matrix.map((row, s) => row.reduce((sum, entry, t) => sum + entry * vector[t], vector[s]));
    const mass = next.reduce((a, b) => a + b, 0);
    const moved = next.reduce((sum, v, s) => sum + Math.abs(v / mass - vector[s]), 0);
    vector = next.map((v) => v / mass);
    if (moved <= 1e-15) break;
  }
  const image = matrix.map((row) => row.reduce((sum, entry, t) => sum + entry * vector[t], 0));
  return image.reduce((a, b) => a + b, 0) / vector.reduce((a, b) => a + b, 0);
}

function distance(k: number) {
  return rule(k + 1, (bits) => !(bits & 1 && (bits >> k) & 1));
}

function quartic(x: number) {
  return QUARTIC.reduce((acc, c) => acc * x + c, 0);
}

function largest() {
  let [lo, hi] = [6600, 6700];
  if (quartic(lo) >= 0 || quartic(hi) <= 0) fail(`quartic has no sign change on [${lo}, ${hi}]`);
  for (let i = 0; i < 200; i++) {
    const mid = (lo + hi) / 2;
    if (quartic(mid) < 0) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

function truncated(x: number, want: number, what: string) {
  if (Math.floor(x * 1e10) / 1e10 !== want) fail(`${what} ${x}, printed ${want}`);
}

function numbers() {
  if (memo) return memo;
  const log3 = (x: number) => Math.log(x) / Math.log(3);
  const phi = perron(distance(1));
  if (Math.abs(phi - (1 + Math.sqrt(5)) / 2) > 1e-12) fail(`distance-one rule grows ${phi}, want phi`);
  const ladder = num.series.fibonacci(100000);
  const fib = (n: number) => BigInt(ladder[n - 1]);
  if (fib(2) !== 1n || fib(3) !== 2n || fib(14) !== 377n || fib(20) !== 6765n)
    fail(`fibonacci ladder ${ladder.slice(0, 21)}`);
  for (const [k, want] of WORDS) {
    const growth = perron(distance(k));
    if (Math.abs(growth - phi) > 1e-12) fail(`distance-${k} rule grows ${growth}, want phi`);
    const count = counts(distance(k), 36);
    const chains = Array.from({ length: k }, (_, r) => Math.floor((36 - (r + 1)) / k) + 1);
    const product = chains.reduce((acc, m) => acc * fib(m + 2), 1n);
    if (count !== want || product !== want)
      fail(`D_${k}(36) counts ${count}, Fibonacci product ${product}, want ${want}`);
  }
  const supergolden = perron(rule(3, (bits) => [0, 1, 2, 4].includes(bits)));
  if (Math.abs(supergolden ** 3 - supergolden ** 2 - 1) > 1e-12) fail(`supergolden rule grows ${supergolden}`);
  const edge = 1 / (2 - log3(phi));
  const cstar = (1 - log3(phi)) / (2 - log3(phi));
  const sgedge = 1 / (2 - log3(supergolden));
  const kappa = 3 - log3(5);
  const kappa10 = 10 - log3(largest());
  const rung = kappa10 / (2 * kappa10 + 2 - kappa);
  const wall = 2 / (3 + log3(5));
  truncated(edge, PRINTED.edge, "edge");
  truncated(cstar, PRINTED.cstar, "c*");
  truncated(sgedge, PRINTED.supergolden, "supergolden edge");
  truncated(wall, PRINTED.wall, "peak wall");
  truncated(rung, PRINTED.rung, "tenth rung");
  const octave = (27 * phi) / (3 - phi) / (1 - phi / 9) + 81 / 8;
  if (!(octave > 48.66 && octave < 48.67)) fail(`octave constant ${octave}`);
  if (!(rung < wall && wall < 0.5 && 0.5 < sgedge && sgedge < edge && edge < 0.6402122))
    fail(`walls out of order ${[rung, wall, sgedge, edge]}`);
  memo = { phi, supergolden, edge, sgedge, rung };
  return memo;
}

export default function draw(pen: Pen, ink: Ink) {
  const { phi, supergolden, edge, sgedge, rung } = numbers();
  const frame = pen.frame(0.08);
  const at = (beta: number, exponent: number): Point => [
    frame.x + frame.w * beta,
    frame.y + frame.h * (1 - exponent / 2),
  ];
  const thick = frame.w / 160;
  pen.rect(frame.x, frame.y, frame.w * rung, frame.h, ink.panel);
  pen.rect(frame.x + frame.w * edge, frame.y, frame.w * (1 - edge), frame.h, ink.panel);
  pen.rect(frame.x + frame.w * rung, frame.y, frame.w * (edge - rung), frame.h, ink.fade(ink.orange, 0.3));
  pen.segment(at(0, 1), at(1, 1), thick, ink.line);
  pen.segment(at(rung, 1), at(edge, 1), 2 * thick, ink.orange);
  const lines: [number, number, Color, number][] = [
    [1, 0.5, ink.dim, thick],
    [supergolden, sgedge, ink.fade(ink.blue, 0.45), 1.5 * thick],
    [phi, edge, ink.blue, 2 * thick],
  ];
  for (const [growth, cross, color, width] of lines) {
    const fall = 2 - Math.log(growth) / Math.log(3);
    pen.segment(at(0, 2), at(1, 2 - fall), width, color);
    const [x, y] = at(cross, 1);
    pen.disc(x, y, 2.5 * width, color);
  }
}
