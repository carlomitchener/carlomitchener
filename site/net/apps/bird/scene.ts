import { Avatar, BIRD, PALETTE } from "../../../../data/site/net/avatar.js";
import { type Opts, type Spec, tidy, type View } from "../../sdk.ts";

export type Knobs = { spin: number; wings: number; glow: number; fringe: number };

export type Drawn = ReturnType<typeof make>;

export const SPEC: Spec = [
  { key: "spin", label: "Spin", kind: "slider", def: 1, min: 0, max: 4, step: 0.25, group: "Glow" },
  { key: "glow", label: "Glow", kind: "toggle", def: 1, group: "Glow" },
  { key: "wings", label: "Wings", kind: "slider", def: 0.35, min: 0, max: 1, step: 0.05, group: "Bird" },
  { key: "fringe", label: "Fringe", kind: "toggle", def: 1, group: "Bird" },
];

export const PAGE = {
  spec: SPEC,
  about: [
    "The bird was captured at the Grand Canyon in 2012. Every image of it is a rendering of one recipe: 301 cubic Beziers, a conic gradient of seven colours, six blurred glow layers and a fringe of seven solid copies.",
    "Here the glow turns and breathes, and the wings flex on the recipe's own rig. The same bird flies in the sky.",
  ],
};

type Point = [number, number];

const TAU = Math.PI * 2;
const IDLE = TAU / 40;
const BREATH = TAU / 7.5;
const BEAT = 2.4;
const FIT = 0.92;
const LIFT = 0.018;
const UP = { flap: 0.8, bend: 0.4, sweep: 0.25 };
const MASK = 1024;
const [GX, GY] = BIRD.gradient.center as Point;
const [BX, BY] = BIRD.bird.center as Point;
const HEIGHT = BIRD.bird.height as number;
const WIDTH = Avatar.width(BIRD) as number;
const BASE = Avatar.flatten(BIRD.outline.cubics, 6) as Point[];
const RING = (BIRD.fringe.colors as string[]).map((name) => Avatar.hexOf(PALETTE, name) as string);
const COLORS = (BIRD.gradient.colors as string[]).map((name) => Avatar.hexOf(PALETTE, name) as string);
const STOPS = [COLORS[0]!, ...COLORS.slice(1).reverse(), COLORS[0]!];
const START = ((BIRD.gradient.start as number) * Math.PI) / 180;
const LIGHT = ((BIRD.fringe.angle as number) * Math.PI) / 180;
const STEP = BIRD.fringe.step as number;
const REACH = Math.max(
  ...(BIRD.glow as { radius?: number; sigma: number }[]).map((g) => (g.radius ?? 0) + 2 * g.sigma),
);

export function mask(): string {
  const k = MASK / (2 * REACH);
  const px = (v: number) => (v * k).toFixed(3);
  const ox = REACH - GX;
  const oy = REACH - GY;
  const layers = (BIRD.glow as { shape: string; radius?: number; sigma: number; center?: Point }[]).map((g, i) => {
    const [cx, cy] = g.center ?? [GX, GY];
    const shape =
      g.shape === "disc"
        ? `<circle cx="${px(cx + ox)}" cy="${px(cy + oy)}" r="${px(g.radius ?? 0)}"/>`
        : `<use href="#b" transform="matrix(${k} 0 0 ${k} ${px(ox)} ${px(oy)})"/>`;
    return `<filter id="f${i}" filterUnits="userSpaceOnUse" x="0" y="0" width="${MASK}" height="${MASK}"><feGaussianBlur stdDeviation="${px(g.sigma)}"/></filter><g filter="url(#f${i})">${shape}</g>`;
  });
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${MASK}" height="${MASK}" viewBox="0 0 ${MASK} ${MASK}" fill="#fff"><defs><path id="b" d="${Avatar.cubicPath(BIRD)}"/></defs>${layers.join("")}</svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

function shape(flap: number): Path2D {
  const pose = { flap: UP.flap * flap, bend: UP.bend * flap, sweep: UP.sweep * flap };
  const points = flap ? (Avatar.deform(BASE, pose, BIRD.rig) as Point[]) : BASE;
  const path = new Path2D();
  for (const [i, [x, y]] of points.entries()) {
    if (i) path.lineTo(x - WIDTH / 2, y - 0.5);
    else path.moveTo(x - WIDTH / 2, y - 0.5);
  }
  path.closePath();
  return path;
}

const night = () => {
  const asked = document.documentElement.dataset.theme;
  return asked ? asked === "dark" : matchMedia("(prefers-color-scheme: dark)").matches;
};

export function make(canvas: HTMLCanvasElement, view: View, opts: Opts = {}) {
  const ctx = canvas.getContext("2d")!;
  const value = tidy(SPEC, opts) as Knobs;
  const layer = document.createElement("canvas");
  const pen = layer.getContext("2d")!;
  const veil = new Image();
  let ready = false;
  let dark = night();
  const paint = () => {
    const { w, h } = view;
    const t = view.t / 1000;
    const m = Math.min(w, h);
    const u = (FIT * m) / BIRD.canvas;
    const cx = w / 2;
    const cy = h / 2;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = dark ? "#000" : "#fff";
    ctx.fillRect(0, 0, w, h);
    const breath = view.still ? 0 : Math.sin(BREATH * t);
    if (value.glow && ready) {
      if (layer.width !== w || layer.height !== h) {
        layer.width = w;
        layer.height = h;
      }
      const r = REACH * u * (1 + 0.025 * breath);
      pen.globalCompositeOperation = "source-over";
      pen.clearRect(0, 0, w, h);
      pen.drawImage(veil, cx - r, cy - r, 2 * r, 2 * r);
      pen.globalCompositeOperation = "source-in";
      const cone = pen.createConicGradient(IDLE * value.spin * t - START, cx, cy);
      for (const [i, color] of STOPS.entries()) cone.addColorStop(i / (STOPS.length - 1), color);
      pen.fillStyle = cone;
      pen.fillRect(0, 0, w, h);
      ctx.globalAlpha = dark ? 1 : 0.6;
      ctx.drawImage(layer, 0, 0);
      ctx.globalAlpha = 1;
    }
    const flap = view.still ? 0 : value.wings * (0.5 - 0.5 * Math.cos((TAU * t) / BEAT));
    const path = shape(flap);
    const size = HEIGHT * u * (1 + LIFT * breath);
    const x = cx + (BX - GX) * u;
    const y = cy + (BY - GY) * u;
    const k = (STEP / HEIGHT) * size;
    const lx = Math.cos(LIGHT);
    const ly = -Math.sin(LIGHT);
    const fill = (dx: number, dy: number, color: string) => {
      ctx.setTransform(size, 0, 0, size, x + dx, y + dy);
      ctx.fillStyle = color;
      ctx.fill(path);
    };
    if (value.fringe) for (let i = RING.length - 1; i >= 0; i--) fill(-(i + 1) * k * lx, -(i + 1) * k * ly, RING[i]!);
    fill(0, 0, dark ? "#000" : "#fff");
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  };
  veil.onload = () => {
    ready = true;
    paint();
  };
  veil.src = mask();
  return {
    draw: paint,
    size: paint,
    theme: () => {
      dark = night();
      paint();
    },
  };
}
