import { download, text } from "mrly-kit/export.ts";
import type { Opts, View } from "mrly-kit/run.ts";
import { type Spec, tidy, type Value } from "mrly-kit/spec.ts";
import { Avatar, BIRD, PALETTE } from "../../../data/site/avatar.js";

type Glow = { shape: string; sigma: number; radius?: number };

type Handle = { svg: () => void; png: () => void; json: () => void };

export type Drawn = ReturnType<typeof make>;

const NAMES = Object.keys(PALETTE);
const GLOWS = BIRD.glow as Glow[];
const LAYERS = ["background", "glow", "fringe", "bird"];
const THEMES = Object.keys(BIRD.themes);
const LIST = ",";

const colors = (key: string, label: string, group: string, list: string[]) => ({
  key,
  label,
  group,
  kind: "list" as const,
  def: list.join(LIST),
  sep: LIST,
  options: NAMES,
  wide: true,
});

const glow = (g: Glow, i: number) => [
  {
    key: `glow${i}`,
    label: `${g.shape === "disc" ? "Disc" : "Bird"} ${i + 1}`,
    kind: "toggle" as const,
    def: 1,
    group: "Glow",
  },
  {
    key: `sigma${i}`,
    label: "Blur",
    kind: "slider" as const,
    def: g.sigma,
    min: 0,
    max: 2000,
    step: 10,
    group: "Glow",
  },
  ...(g.shape === "disc"
    ? [
        {
          key: `radius${i}`,
          label: "Radius",
          kind: "slider" as const,
          def: g.radius!,
          min: 0,
          max: 2500,
          step: 50,
          group: "Glow",
        },
      ]
    : []),
];

export const SPEC: Spec = [
  { key: "mode", label: "Mode", kind: "segment", def: THEMES[0]!, options: THEMES, group: "Colors" },
  { key: "paint", label: "Bird", kind: "pick", def: "", options: [["", "Theme"], ...NAMES], group: "Colors" },
  { key: "back", label: "Background", kind: "pick", def: "", options: [["", "Theme"], ...NAMES], group: "Colors" },
  ...LAYERS.map((key) => ({
    key,
    label: key[0]!.toUpperCase() + key.slice(1),
    kind: "toggle" as const,
    def: 1,
    group: "Layers",
  })),
  ...GLOWS.flatMap(glow),
  {
    key: "start",
    label: "Start",
    kind: "slider",
    def: BIRD.gradient.start,
    min: 0,
    max: 360,
    step: 1,
    group: "Gradient",
  },
  colors("gradient", "Colors", "Gradient", BIRD.gradient.colors),
  { key: "angle", label: "Angle", kind: "slider", def: BIRD.fringe.angle, min: 0, max: 360, step: 1, group: "Fringe" },
  { key: "step", label: "Step", kind: "slider", def: BIRD.fringe.step, min: 0, max: 60, step: 0.5, group: "Fringe" },
  colors("fringe", "Colors", "Fringe", BIRD.fringe.colors),
  { key: "crop", label: "Crop to bird", kind: "toggle", def: 0, group: "Export" },
  { key: "wedges", label: "Wedges", kind: "segment", def: 360, options: [90, 180, 360, 720], group: "Export" },
  { key: "size", label: "Size", kind: "segment", def: 1000, options: [500, 1000, 2000, 5000], group: "Export" },
];

export const PAGE = {
  spec: SPEC,
  keys: [
    { key: "s", label: "SVG", act: "svg", button: true },
    { key: "p", label: "PNG", act: "png", button: true },
    { key: "j", label: "Recipe", act: "json", button: true },
  ],
  actions: {
    svg: (scene: Handle) => scene.svg(),
    png: (scene: Handle) => scene.png(),
    json: (scene: Handle) => scene.json(),
  },
  about: [
    "The bird was captured at the Grand Canyon in 2012. Every image of it is a rendering of one recipe: cubic Beziers, a conic gradient, blurred glow layers and a fringe of solid copies.",
  ],
};

const list = (value: Value, key: string) => String(value[key]).split(LIST);

function recipe(value: Value) {
  const one = structuredClone(BIRD);
  one.gradient.start = Number(value.start);
  one.gradient.colors = list(value, "gradient");
  one.fringe.angle = Number(value.angle);
  one.fringe.step = Number(value.step);
  one.fringe.colors = list(value, "fringe");
  for (const [i, g] of (one.glow as Glow[]).entries()) {
    g.sigma = Number(value[`sigma${i}`]);
    if (g.shape === "disc") g.radius = Number(value[`radius${i}`]);
  }
  return one;
}

function drawing(value: Value) {
  const on = (key: string) => Boolean(Number(value[key]));
  return Avatar.build(recipe(value), PALETTE, {
    theme: value.mode,
    bird: value.paint || null,
    background: value.back || null,
    layers: Object.fromEntries(LAYERS.map((key) => [key, on(key)])),
    glow: GLOWS.map((_, i) => on(`glow${i}`)),
    crop: on("crop"),
    wedges: Number(value.wedges),
  }) as SVGSVGElement;
}

const load = (src: string) =>
  new Promise<HTMLImageElement>((done, fail) => {
    const img = new Image();
    img.onload = () => done(img);
    img.onerror = fail;
    img.src = src;
  });

export function make(canvas: HTMLCanvasElement, view: View, opts: Opts = {}) {
  const ctx = canvas.getContext("2d")!;
  let value = tidy(SPEC, opts);
  let image: HTMLImageElement | null = null;
  let turn = 0;
  const paint = async () => {
    const mine = ++turn;
    const px = Math.max(view.w, view.h, 1);
    const url = URL.createObjectURL(new Blob([Avatar.serialize(drawing(value), px)], { type: "image/svg+xml" }));
    const img = await load(url).finally(() => URL.revokeObjectURL(url));
    if (mine !== turn) return;
    image = img;
    show();
  };
  const show = () => {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (!image) return;
    const k = Math.min(view.w / image.width, view.h / image.height);
    const w = image.width * k;
    const h = image.height * k;
    ctx.drawImage(image, (view.w - w) / 2, (view.h - h) / 2, w, h);
  };
  const name = () => `bird-${value.mode}`;
  paint();
  return {
    draw: show,
    size: paint,
    set(next: Opts) {
      value = tidy(SPEC, next);
      paint();
      return true;
    },
    svg: () => text(Avatar.serialize(drawing(value)), name(), "svg"),
    png: async () => download(await Avatar.toPNG(drawing(value), Number(value.size)), `${name()}-${value.size}.png`),
    json: () => text(JSON.stringify(recipe(value), null, 1), `${name()}-recipe`, "json"),
    stop: () => {
      turn++;
    },
  };
}
