import { field, type Ink, type Pen } from "mrly-draw";
import * as tensor from "mrly-tensor/wasm";
import * as two from "mrly-two/wasm";

type Profile = { rings: Float64Array; lo: number; hi: number };

const LEVEL = 5;
const SIDE = 243;
const RINGS = 1600;

export const units = { tensor, two };

function mirror() {
  const carpet = two.create(495, 3, LEVEL, 0, 3);
  if (carpet.shape[0] !== SIDE || carpet.shape[1] !== SIDE)
    throw new Error(`research-spin: carpet ${carpet.shape}, want ${SIDE} square`);
  const flat = { shape: carpet.shape, data: carpet.types };
  const down = tensor.flip(flat, 0);
  const quarters = [tensor.flip(down, 1), down, tensor.flip(flat, 1), flat];
  const whole = two.merge(
    quarters.map((q) => ({ shape: q.shape, types: q.data })),
    2,
    2,
  );
  return Float32Array.from(whole.types);
}

function ring(data: Float32Array, size: number, radius: number) {
  const tau = 2 * Math.PI;
  const c = size / 2;
  const r = Math.max(radius, 1e-9);
  const cuts = [0, tau];
  const low = Math.max(Math.floor(c - r), 0);
  const high = Math.min(Math.ceil(c + r), size);
  for (let line = low; line <= high; line++) {
    const u = (line - c) / r;
    if (Math.abs(u) >= 1) continue;
    const a = Math.acos(u);
    const b = Math.asin(u);
    cuts.push(a, tau - a, ((b % tau) + tau) % tau, (((Math.PI - b) % tau) + tau) % tau);
  }
  cuts.sort((p, q) => p - q);
  let total = 0;
  for (let i = 0; i + 1 < cuts.length; i++) {
    const [a, b] = [cuts[i], cuts[i + 1]];
    if (b <= a) continue;
    const mid = (a + b) / 2;
    const x = c + r * Math.cos(mid);
    const y = c + r * Math.sin(mid);
    if (x < 0 || y < 0) continue;
    const [col, row] = [Math.floor(x), Math.floor(y)];
    if (col < size && row < size) total += data[row * size + col] * (b - a);
  }
  return total / tau;
}

let memo: Profile | null = null;

function profile(): Profile {
  if (memo) return memo;
  const field = mirror();
  const rings = new Float64Array(RINGS + 1);
  for (let k = 0; k <= RINGS; k++) rings[k] = ring(field, 2 * SIDE, (SIDE * k) / RINGS);
  let lo = Number.MAX_VALUE;
  let hi = -Number.MAX_VALUE;
  for (const v of rings) {
    lo = Math.min(lo, v);
    hi = Math.max(hi, v);
  }
  if (!(hi - lo > 0.5)) throw new Error(`research-spin: profile spans ${hi - lo}, want over 0.5`);
  memo = { rings, lo, hi };
  return memo;
}

export default function draw(pen: Pen, ink: Ink) {
  const { rings, lo, hi } = profile();
  const ramp = new ink.Ramp([ink.ground, ink.blue, ink.yellow]);
  const box = pen.frame(0.08);
  const [cx, cy] = box.center();
  const reach = box.radius();
  const x0 = Math.floor(Math.max(cx - reach - 1, 0));
  const y0 = Math.floor(Math.max(cy - reach - 1, 0));
  const x1 = Math.min(Math.floor(cx + reach + 1), pen.width);
  const y1 = Math.min(Math.floor(cy + reach + 1), pen.height);
  const disc = field.patch(x0, y0, x1 - x0, y1 - y0);
  for (let py = y0; py < y1; py++) {
    for (let px = x0; px < x1; px++) {
      const dx = px + 0.5 - cx;
      const dy = py + 0.5 - cy;
      const d = Math.sqrt(dx * dx + dy * dy);
      const cover = Math.min(Math.max(reach + 0.5 - d, 0), 1);
      if (cover <= 0) continue;
      const t = (d / reach) * RINGS;
      const i = Math.min(Math.floor(t), RINGS - 1);
      const f = t - i;
      const value = rings[i] * (1 - f) + rings[i + 1] * f;
      disc.blend(px, py, ramp.at((value - lo) / (hi - lo)), cover);
    }
  }
  disc.paint(pen);
}
