import type { Color, Ink, Pen, Point } from "mrly-draw";
import * as num from "mrly-num/wasm";

export const units = { num };

const BASE = 10;
const LEVEL = 3;
const Z = 8;
const COUNTS = [732, 202, 26, 40];
const NAMES = ["A", "B", "C1", "C2"];

let memo: number[] | undefined;

function fraction(a: number, y: number, cap: number): [number, number] {
  let [p0, q0, p1, q1] = [0, 1, 1, 0];
  let [n, d] = [a, y];
  let best: [number, number] = [0, 1];
  while (d > 0) {
    const c = Math.floor(n / d);
    const [p2, q2] = [c * p1 + p0, c * q1 + q0];
    if (q2 > cap) break;
    [p0, q0, p1, q1] = [p1, q1, p2, q2];
    best = [p2, q2];
    [n, d] = [d, n - c * d];
  }
  return best;
}

function cap(y: number) {
  const cube = BigInt(y) ** 3n;
  let c = Math.floor(y ** 0.6);
  while (BigInt(c + 1) ** 5n <= cube) c++;
  while (c > 0 && BigInt(c) ** 5n > cube) c--;
  return c;
}

function smooth(d: number) {
  for (;;) {
    const g = Number(num.factor.gcd(d, BASE));
    if (g === 1) return d === 1;
    while (d % g === 0) d /= g;
  }
}

function classify(y: number): number[] {
  const top = cap(y);
  return Array.from({ length: y }, (_, a) => {
    const [l, d] = fraction(a, y, top);
    const h = Math.abs(a * d - l * y);
    if (BigInt(d) ** 5n >= BigInt(y) ** 2n) return 0;
    if (d < Z && h < Z) return smooth(d) ? 3 : 2;
    return 1;
  });
}

function regions() {
  if (memo) return memo;
  const y = BASE ** LEVEL;
  const found = classify(y);
  if (found.length !== y || found.includes(-1))
    throw new Error(`paper-unconditional-mertens-at-large-base: ${found.length} regions, want ${y} named ${NAMES}`);
  const top = cap(y);
  for (let a = 0; a < y; a++) {
    const [l, d] = fraction(a, y, top);
    const h = Math.abs(a * d - l * y);
    if (d > top || h * top > y || num.factor.gcd(l, d) !== "1")
      throw new Error(
        `paper-unconditional-mertens-at-large-base: frequency ${a} has fraction ${l}/${d} off the Dirichlet bound`,
      );
  }
  const counts = [0, 0, 0, 0];
  for (const r of found) counts[r]++;
  if (counts.some((count, r) => count !== COUNTS[r]))
    throw new Error(`paper-unconditional-mertens-at-large-base: counts ${counts}, want ${COUNTS}`);
  memo = found;
  return memo;
}

function band(pen: Pen, center: Point, radii: Point, angles: Point, color: Color) {
  const at = (r: number, t: number): Point => [center[0] + r * Math.sin(t), center[1] - r * Math.cos(t)];
  const steps = Math.max(Math.ceil((angles[1] - angles[0]) / 0.004), 1);
  const pts: Point[] = [];
  for (let i = 0; i <= steps; i++) pts.push(at(radii[1], angles[0] + ((angles[1] - angles[0]) * i) / steps));
  for (let i = steps; i >= 0; i--) pts.push(at(radii[0], angles[0] + ((angles[1] - angles[0]) * i) / steps));
  pen.polygon(pts, color);
}

function runs(found: number[], pass: number) {
  const n = found.length;
  let start = found.findIndex((r) => r !== pass);
  if (start < 0) start = 0;
  const out: Point[] = [];
  let open: number | undefined;
  for (let step = 1; step <= n; step++) {
    const a = start + step;
    const inside = found[a % n] === pass;
    if (open === undefined && inside) open = a;
    else if (open !== undefined && !inside) {
      out.push([open, a]);
      open = undefined;
    }
  }
  if (open !== undefined) out.push([open, start + n + 1]);
  return out;
}

export default function draw(pen: Pen, ink: Ink) {
  const found = regions();
  const y = BASE ** LEVEL;
  const frame = pen.frame(0.08);
  const center = frame.center();
  const outer = frame.radius();
  const slot = (2 * Math.PI) / y;
  const width = 0.12 * outer;
  const tracks = [0.28, 0.48, 0.68, 0.88];
  const inks = [ink.blue, ink.dim, ink.orange, ink.yellow];
  for (let pass = 0; pass < 4; pass++) {
    const mid = tracks[pass] * outer + width / 2;
    pen.ring(center[0], center[1], mid, 1, ink.line);
    let held = 0;
    for (const [first, end] of runs(found, pass)) {
      held += end - first;
      band(pen, center, [mid - width / 2, mid + width / 2], [(first - 0.5) * slot, (end - 0.5) * slot], inks[pass]);
    }
    if (held !== COUNTS[pass])
      throw new Error(`paper-unconditional-mertens-at-large-base: pass ${pass} holds ${held}, want ${COUNTS[pass]}`);
  }
}
