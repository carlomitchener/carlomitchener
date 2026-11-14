import { type Color, type Frame, frame, type Ink, type Pen, type Point, plot } from "mrly-draw";
import * as num from "mrly-num/wasm";
import * as zeta from "mrly-zeta/wasm";
import census from "./paper-novelty-meter.json" with { type: "json" };

const LOW = 8;
const HIGH = 20.5;
const PER_OCTAVE = 16;
const ZEROS = 29;
const CURVE = 2400;

export const units = { num, zeta };

type Complex = { re: number; im: number };

const SHIFT = 10;
const TAIL = 7;
const NODES = 4096;

const add = (a: Complex, b: Complex): Complex => ({ re: a.re + b.re, im: a.im + b.im });
const sub = (a: Complex, b: Complex): Complex => ({ re: a.re - b.re, im: a.im - b.im });
const mul = (a: Complex, b: Complex): Complex => ({ re: a.re * b.re - a.im * b.im, im: a.re * b.im + a.im * b.re });
const scale = (a: Complex, k: number): Complex => ({ re: a.re * k, im: a.im * k });
const real = (re: number): Complex => ({ re, im: 0 });
const neg = (a: Complex): Complex => scale(a, -1);

function div(a: Complex, b: Complex): Complex {
  const norm = b.re * b.re + b.im * b.im;
  return { re: (a.re * b.re + a.im * b.im) / norm, im: (a.im * b.re - a.re * b.im) / norm };
}

function raise(base: number, exponent: Complex): Complex {
  const log = Math.log(base);
  return scale({ re: Math.cos(exponent.im * log), im: Math.sin(exponent.im * log) }, base ** exponent.re);
}

function bump(u: number) {
  if (u <= 1 || u >= 2) return 0;
  return Math.exp(4 - 1 / ((u - 1) * (2 - u)));
}

function mellin(s: Complex) {
  const step = 1 / NODES;
  let sum = real(0);
  for (let k = 1; k < NODES; k++) {
    const u = 1 + k * step;
    sum = add(sum, scale(raise(u, sub(s, real(1))), bump(u) * step));
  }
  return sum;
}

function tail() {
  const bern = num.series
    .bernoulli(2 * TAIL + 1)
    .filter((_, i) => i % 2 === 0)
    .map(([n, d]) => Number(n) / Number(d));
  let factorial = 1;
  return bern.map((value, k) => {
    if (k > 0) factorial *= (2 * k - 1) * 2 * k;
    return value / factorial;
  });
}

function pair(s: Complex, weights: number[]): [Complex, Complex] {
  const count = Math.floor(Math.abs(s.im)) + SHIFT;
  let value = real(0);
  let slope = real(0);
  for (let k = 1; k <= count; k++) {
    const term = raise(k, neg(s));
    value = add(value, term);
    slope = sub(slope, scale(term, Math.log(k)));
  }
  const log = Math.log(count);
  const less = sub(s, real(1));
  const head = div(raise(count, sub(real(1), s)), less);
  const half = scale(raise(count, neg(s)), 0.5);
  value = sub(add(value, head), half);
  slope = add(sub(sub(slope, scale(head, log)), div(head, less)), scale(half, log));
  let rising = s;
  let ratio = div(real(1), s);
  let power = raise(count, sub(neg(s), real(1)));
  const square = 1 / (count * count);
  for (let k = 1; k < weights.length; k++) {
    const term = scale(mul(rising, power), weights[k]);
    value = add(value, term);
    slope = add(slope, mul(term, sub(ratio, real(log))));
    const a = add(s, real(2 * k - 1));
    const b = add(s, real(2 * k));
    rising = mul(mul(rising, a), b);
    ratio = add(add(ratio, div(real(1), a)), div(real(1), b));
    power = scale(power, square);
  }
  return [value, slope];
}

function coefficients(gammas: Float64Array): Complex[] {
  const weights = tail();
  return Array.from(gammas, (g) => {
    const rho: Complex = { re: 0.5, im: g };
    const [left] = pair(sub(rho, real(1)), weights);
    const [, prime] = pair(rho, weights);
    return div(mul(mellin(rho), left), prime);
  });
}

function noveltyWave(gammas: Float64Array, coef: Complex[], logY: number) {
  let sum = 0;
  gammas.forEach((g, k) => {
    const angle = -g * logY;
    sum += coef[k].re * Math.cos(angle) - coef[k].im * Math.sin(angle);
  });
  return 2 * sum;
}

let memo: number[] | undefined;

function wave() {
  if (memo) return memo;
  const { smooth, rough } = census;
  const samples = Math.round((HIGH - LOW) * PER_OCTAVE) + 1;
  if (smooth.length !== samples || rough.length !== samples)
    throw new Error(`paper-novelty-meter: ${smooth.length} smooth and ${rough.length} rough samples, want ${samples}`);
  const line = new zeta.Line();
  const gammas = line.zeros(ZEROS);
  if (!(Math.abs(gammas[0] - 14.134725) < 1e-6))
    throw new Error(`paper-novelty-meter: first zero ${gammas[0]}, want 14.134725`);
  if (!(Math.abs(gammas[ZEROS - 1] - 98.831194) < 1e-5))
    throw new Error(`paper-novelty-meter: last zero ${gammas[ZEROS - 1]}, want 98.831194`);
  const coef = coefficients(gammas);
  if (!(Math.abs(Math.hypot(coef[0].re, coef[0].im) - 0.1879) < 5e-4))
    throw new Error(`paper-novelty-meter: first coefficient ${Math.hypot(coef[0].re, coef[0].im)}, want 0.1879`);
  if (!(Math.abs(Math.hypot(coef[9].re, coef[9].im) - 4.286e-3) < 5e-6))
    throw new Error(`paper-novelty-meter: tenth coefficient ${Math.hypot(coef[9].re, coef[9].im)}, want 0.004286`);
  const at = (j: number) => noveltyWave(gammas, coef, -j * Math.LN2);
  const peak = smooth.reduce((a, v) => Math.max(a, Math.abs(v)), 0);
  const miss = smooth.reduce((m, v, k) => Math.max(m, Math.abs(v - at(LOW + k / PER_OCTAVE))), 0);
  if (!(miss / peak < 1e-2)) throw new Error(`paper-novelty-meter: the zeros miss ${miss / peak}, want under 0.01`);
  memo = Array.from({ length: CURVE + 1 }, (_, k) => at(LOW + (HIGH - LOW) * (k / CURVE)));
  return memo;
}

function beads(pen: Pen, area: Frame, values: number[], span: number, r: number, color: Color) {
  const last = values.length - 1;
  plot.dots(
    pen,
    values.map((v, i): Point => [area.x + (area.w * i) / last, area.y + area.h * (0.5 - (0.5 * v) / span)]),
    r,
    color,
  );
}

function reach(values: number[]) {
  return values.reduce((a, v) => Math.max(a, Math.abs(v)), 0) * 1.12;
}

export default function draw(pen: Pen, ink: Ink) {
  const { smooth, rough } = census;
  const values = wave();
  const area = pen.frame(0.08);
  const gap = 28;
  const topH = area.h * 0.62 - gap / 2;
  const top = frame(area.x, area.y, area.w, topH);
  const foot = frame(area.x, area.y + topH + gap, area.w, area.h - topH - gap);
  for (const box of [top, foot]) {
    plot.axis(pen, box, ink.line);
    const mid = box.y + box.h / 2;
    pen.segment([box.x, mid], [box.x + box.w, mid], 1, ink.line);
  }
  const innerTop = top.inset(16);
  const innerFoot = foot.inset(16);
  const spanTop = reach(smooth);
  const spanFoot = reach(rough);
  const curve = values.map((v, k): Point => {
    const t = k / CURVE;
    return [innerTop.x + innerTop.w * t, innerTop.y + innerTop.h * (0.5 - (0.5 * v) / spanTop)];
  });
  pen.polyline(curve, 2, ink.orange);
  beads(pen, innerTop, smooth, spanTop, 3.4, ink.blue);
  beads(pen, innerFoot, rough, spanFoot, 3.4, ink.blue);
}
