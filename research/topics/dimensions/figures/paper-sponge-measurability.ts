import { type Frame, field, frame, Grid, type Ink, type Pen, plot } from "mrly-draw";
import * as three from "mrly-three/wasm";

export const units = { three };

const LEVEL = 4;
const SIDE = 81;
const EPS = 1 / 36;
const PLATE = 600;
const BANDS = [
  [1 / 12, 2.122718, 2.122723],
  [1 / 8, 2.134668, 2.135742],
  [1 / 6, 2.135019, 2.136794],
];
const TUBES = [
  [1 / 12, 0.180947086, 0.180947093],
  [1 / 8, 0.234186414, 0.234701259],
];

const EDGE = 1 / 6;
const COVER = Math.SQRT2 / 6;
const PLUS = 7 / 27;
const DEPTH = 40;
const DIGITS = 40;
const FLOOR = 32;
const REACH = 14;
const WEIGHT = [3, 2, 3];
const RUNNING = [0, 3, 5];

const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi);

function split(x: number): [number, number] {
  const digit = clamp(Math.floor(3 * x), 0, 2);
  return [digit, clamp(3 * x - digit, 0, 1)];
}

function carpet(across: number, along: number) {
  let scale = 1 / 3;
  for (let i = 0; i < DIGITS; i++) {
    const [a, fa] = split(across);
    const [b, fb] = split(along);
    if (a === 1 && b === 1) return scale * Math.min(fa, 1 - fa, fb, 1 - fb);
    across = fa;
    along = fb;
    scale /= 3;
  }
  return 0;
}

const gap = (v: number) => Math.min(Math.abs(v - 1 / 3), Math.abs(v - 2 / 3));

function plus(point: number[]) {
  const middle = point.map((v) => v >= 1 / 3 && v <= 2 / 3);
  const gaps = point.map(gap);
  const axis = [0, 1, 2].find((k) => !middle[k]);
  if (axis === undefined) {
    const sorted = [...gaps].sort((a, b) => a - b);
    return Math.hypot(sorted[0], sorted[1]);
  }
  const v = point[axis];
  const along = 3 * (v < 1 / 3 ? v : v - 2 / 3);
  const [i, j] = [(axis + 1) % 3, (axis + 2) % 3];
  const wallI = carpet(3 * point[j] - 1, along) / 3;
  const wallJ = carpet(3 * point[i] - 1, along) / 3;
  return Math.min(Math.hypot(gaps[i], wallI), Math.hypot(gaps[j], wallJ));
}

function distance(point: number[]) {
  let local = point.map((v) => clamp(v, 0, 1));
  let scale = 1;
  for (let i = 0; i < DIGITS; i++) {
    const digits = local.map(split);
    if (digits.filter(([d]) => d === 1).length >= 2) return scale * plus(local);
    local = digits.map(([, rest]) => rest);
    scale /= 3;
  }
  return 0;
}

function sweep(t: number, radius: number) {
  if (t >= radius) return (Math.PI * radius * radius) / 4;
  return (t / 2) * Math.sqrt(radius * radius - t * t) + ((radius * radius) / 2) * Math.asin(t / radius);
}

function moment(t: number, radius: number) {
  const r2 = radius * radius;
  if (t >= radius) return (r2 * radius) / 3;
  const rest = r2 - t * t;
  return (t * t * (3 * r2 * r2 - 3 * r2 * t * t + t ** 4)) / (3 * (r2 * radius + rest * Math.sqrt(rest)));
}

function piece(from: number, to: number, width: number, slope: number, radius: number) {
  if (to <= from) return 0;
  return width * (sweep(to, radius) - sweep(from, radius)) - slope * (moment(to, radius) - moment(from, radius));
}

const hole = (side: number, radius: number) => 4 * piece(0, side / 2, side, 2, radius);

function partial(side: number, cut: number, radius: number) {
  const left = piece(0, Math.min(side / 2, cut), side, 2, radius);
  const right = piece(Math.max(side - cut, 0), side / 2, side, 2, radius);
  const bottom =
    cut <= side / 2
      ? piece(0, cut, cut, 1, radius)
      : piece(0, side - cut, cut, 1, radius) + piece(side - cut, side / 2, side, 2, radius);
  return left + right + 2 * bottom;
}

function places(count: number, digits: number) {
  const out: number[] = [];
  for (let i = 0; i < digits; i++) {
    const rest = Math.floor(count / 3);
    out.push(Math.min(count - 3 * rest, 2));
    count = rest;
  }
  return out;
}

const column = (index: number, digits: number) => places(index, digits).reduce((p, k) => p * WEIGHT[k], 1);

function below(count: number, digits: number) {
  if (count >= 3 ** digits) return 8 ** digits;
  let [total, prefix, eight] = [0, 1, 8 ** digits];
  for (const k of places(count, digits).reverse()) {
    eight /= 8;
    total += prefix * RUNNING[k] * eight;
    prefix *= WEIGHT[k];
  }
  return total;
}

const levels = (radius: number) => Math.max(Math.ceil(Math.log(1 / radius) / Math.log(3)) + REACH, FLOOR);

const width = (level: number) => 3 ** (-level - 1);

function wall(radius: number, top: number) {
  let total = 0;
  for (let level = 1; level <= top; level++) total += 8 ** (level - 1) * hole(width(level), radius);
  return total / 2 + (radius * (8 / 9) ** top) / 18;
}

function strip(radius: number, top: number) {
  let [total, share] = [0, 0];
  for (let level = 1; level <= top; level++) {
    const side = width(level);
    const ratio = radius / side;
    const columns = 3 ** (level - 1);
    let here = 0;
    const full = Math.floor((ratio - 2) / 3) + 1;
    if (full > 0) here += below(Math.min(full, columns), level - 1) * hole(side, radius);
    const cut = Math.floor((ratio - 1) / 3);
    const start = (3 * cut + 1) * side;
    if (cut >= 0 && cut < columns && start < radius && radius < start + side)
      here += column(cut, level - 1) * partial(side, radius - start, radius);
    total += here;
    share = here / (8 ** (level - 1) * radius * side * side);
  }
  return total + (share * radius * (8 / 9) ** top) / 9;
}

function inside(radius: number) {
  const top = levels(radius);
  return (Math.PI + 8) * radius * radius - 8 * Math.SQRT2 * radius ** 3 + 48 * (wall(radius, top) - strip(radius, top));
}

function tube(radius: number) {
  if (Number.isNaN(radius) || (radius > EDGE && radius < COVER)) return undefined;
  if (radius <= 0) return 0;
  if (radius >= COVER) return PLUS;
  return inside(radius);
}

function profile(radius: number) {
  if (!(radius > 0 && Number.isFinite(radius))) return undefined;
  let phase = radius;
  while (phase > COVER) phase /= 3;
  while (phase <= COVER / 3) phase *= 3;
  if (phase > EDGE) return undefined;
  let [total, weight, reach] = [20 / 27, 1, phase];
  for (let i = 0; i <= DEPTH; i++) {
    const t = tube(reach);
    if (t === undefined) return undefined;
    total += weight * t;
    weight *= 27 / 20;
    reach /= 3;
  }
  return phase ** (Math.log(20) / Math.log(3) - 3) * total;
}

const dist = (x: number, y: number) => distance([x, y, 0.5]);

let memo: { cells: ArrayLike<number>; covers: Float64Array } | undefined;

function facts() {
  if (memo) return memo;
  const cube = three.carpet(3, LEVEL);
  let filled = 0;
  for (const kind of cube.types) filled += kind;
  if (filled !== 160000) throw new Error(`paper-sponge-measurability: carpet sums to ${filled}, want 160000`);
  const dust = three.slice(cube, 2, (SIDE - 1) / 2);
  const cells = dust.types;
  if (cells.length !== SIDE * SIDE)
    throw new Error(`paper-sponge-measurability: slice of ${cells.length} cells, want ${SIDE * SIDE}`);
  let lit = 0;
  for (const kind of cells) if (kind !== 0) lit++;
  if (lit !== 256) throw new Error(`paper-sponge-measurability: slice lights ${lit} cells, want 256`);

  const ident = (Math.PI + 8) / 36 - Math.sqrt(2) / 27;
  if (!(Math.abs((tube(1 / 6) ?? 0) - ident) < 1e-9))
    throw new Error("paper-sponge-measurability: tube(1/6) is off the closed form");
  for (const [delta, lo, hi] of TUBES) {
    const t = tube(delta) ?? 0;
    if (!(lo <= t && t <= hi))
      throw new Error(`paper-sponge-measurability: tube(${delta}) is ${t}, want ${lo} to ${hi}`);
  }
  const values = [0, 0, 0];
  BANDS.forEach(([eps, lo, hi], k) => {
    values[k] = profile(eps) ?? 0;
    if (!(lo <= values[k] && values[k] <= hi))
      throw new Error(`paper-sponge-measurability: profile(${eps}) is ${values[k]}, want ${lo} to ${hi}`);
  });
  if (!(values[2] - values[0] >= 0.012296))
    throw new Error("paper-sponge-measurability: the profile gap is under 0.012296");
  if (!(Math.abs(dist(0.5, 0.5) - COVER) < 1e-15))
    throw new Error("paper-sponge-measurability: the centre is off the covering radius");
  if (!(Math.abs(dist(1 / 6, 1 / 6) - Math.sqrt(2) / 18) < 1e-15))
    throw new Error("paper-sponge-measurability: the arm is off sqrt(2)/18");

  const covers = new Float64Array(PLATE * PLATE);
  for (let j = 0; j < PLATE; j++) {
    for (let i = 0; i < PLATE; i++) {
      const cover = 0.5 + (EPS - dist((i + 0.5) / PLATE, (j + 0.5) / PLATE)) * PLATE;
      covers[j * PLATE + i] = Math.min(Math.max(cover, 0), 1);
    }
  }
  memo = { cells, covers };
  return memo;
}

function bands(pen: Pen, ink: Ink, box: Frame) {
  plot.axis(pen, box, ink.line);
  const area = box.inset(24);
  const [lo, hi] = [2.12, 2.14];
  const yOf = (v: number) => area.y + (area.h * (hi - v)) / (hi - lo);
  const width = area.w * 0.3;
  const [a, b] = [BANDS[0], BANDS[2]];
  [a, b].forEach((band, k) => {
    const x = area.x + area.w * (0.25 + 0.5 * k) - width / 2;
    const [top, foot] = [yOf(band[2]), yOf(band[1])];
    pen.rect(x, top, width, Math.max(foot - top, 4), ink.orange);
  });
  const [cx, gapLo, gapHi] = [area.x + area.w / 2, yOf(a[2]) - 2, yOf(b[1]) + 2];
  pen.segment([cx, gapLo], [cx, gapHi], 2, ink.dim);
  pen.segment([cx - 10, gapLo], [cx + 10, gapLo], 2, ink.dim);
  pen.segment([cx - 10, gapHi], [cx + 10, gapHi], 2, ink.dim);
}

export default function draw(pen: Pen, ink: Ink) {
  const { cells, covers } = facts();
  const margin = Math.round(pen.width * 0.08);
  const sheet = frame(margin, margin, PLATE, PLATE);
  pen.rect(sheet.x, sheet.y, sheet.w, sheet.h, ink.panel);
  const tube = field.patch(sheet.x, sheet.y, PLATE, PLATE);
  for (let j = 0; j < PLATE; j++) {
    for (let i = 0; i < PLATE; i++) {
      const cover = covers[j * PLATE + i];
      if (cover > 0) tube.blend(sheet.x + i, sheet.y + j, ink.blue, cover);
    }
  }
  tube.paint(pen);
  const lattice = new Grid(sheet, SIDE, SIDE, 0);
  for (let row = 0; row < SIDE; row++) {
    for (let col = 0; col < SIDE; col++) if (cells[row * SIDE + col] !== 0) lattice.fill(pen, col, row, ink.fg);
  }
  bands(pen, ink, frame(pen.width - margin - 240, pen.height - margin - 240, 240, 240));
}
