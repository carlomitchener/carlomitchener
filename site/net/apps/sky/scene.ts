import { sky } from "../../../../data/site/net/avatar.js";
import { type Opts, pick, type Rng, type Spec, tidy, type View } from "../../sdk.ts";

/* SPEC */

export type Knobs = { mood: string; time: string; season: string; weather: string; auto: number };

export type Painted = ReturnType<typeof make>;

type Turn = "time" | "season" | "weather";

type Handle = { day: () => void; turn: (kind: Turn) => void; dive: () => void };

const named = (one: string) => one[0]!.toUpperCase() + one.slice(1).replace("-", " ");

const any = (word: string, list: string[]): [string, string][] => [
  ["", word],
  ...list.map((one): [string, string] => [one, named(one)]),
];

export const MOODS = [
  "golden",
  "dawn-spring",
  "dusk-autumn",
  "storm",
  "rain",
  "fog",
  "winter-night",
  "snow-day",
  "full-moon",
  "new-moon",
];

export const TURNS: Record<Turn, string[]> = {
  time: ["dawn", "morning", "noon", "afternoon", "dusk", "night"],
  season: ["spring", "summer", "autumn", "winter"],
  weather: ["clear", "cloudy", "rain", "storm", "snow", "fog"],
};

export const SPEC: Spec = [
  { key: "mood", label: "Mood", kind: "pick", def: "", options: any("Any", MOODS), group: "Sky" },
  { key: "auto", label: "Drift", kind: "toggle", def: 1, group: "Sky" },
  { key: "time", label: "Time", kind: "pick", def: "", options: any("Mood", TURNS.time), group: "Moment" },
  { key: "season", label: "Season", kind: "pick", def: "", options: any("Mood", TURNS.season), group: "Moment" },
  { key: "weather", label: "Weather", kind: "pick", def: "", options: any("Mood", TURNS.weather), group: "Moment" },
];

export const PAGE = {
  spec: SPEC,
  keys: [
    { key: "v", label: "Dive", act: "dive", button: true },
    { key: "d", label: "Day or night", act: "day" },
    { key: "t", label: "Time", act: "time" },
    { key: "s", label: "Season", act: "season" },
    { key: "w", label: "Weather", act: "weather" },
  ],
  actions: {
    dive: (scene: Handle) => scene.dive(),
    day: (scene: Handle) => scene.day(),
    time: (scene: Handle) => scene.turn("time"),
    season: (scene: Handle) => scene.turn("season"),
    weather: (scene: Handle) => scene.turn("weather"),
  },
  about: [
    "Look up. Clouds grow on five layers over a curved dome and shade toward the sun; rain, snow, fog, lightning, leaves and seeds ride a gusty wind; the sun and the moon keep their own arcs.",
    "The bird soars, glides, dives and plays with visiting crows. With Drift on, a day lasts six minutes, a season three days, and the weather wanders on its own.",
    "The same sky is the desktop of this site.",
  ],
};

export const SAVERS = [
  { id: "drift", title: "Drifting sky", pick: () => ({ auto: 1 }) },
  {
    id: "golden",
    title: "Golden hours",
    pick: (rand: Rng) => ({ mood: pick(rand, ["golden", "dawn-spring", "dusk-autumn"]), auto: 1 }),
  },
  {
    id: "night",
    title: "Night sky",
    pick: (rand: Rng) => ({ mood: pick(rand, ["winter-night", "full-moon", "new-moon"]), auto: 0 }),
  },
];

const STEP = 0.05;

/* SCENE */

export function search(value: Knobs, seed: number): string {
  const q = new URLSearchParams({ seed: String(seed >>> 0), pause: "1", auto: String(value.auto) });
  for (const key of ["mood", "time", "season", "weather"] as const) if (value[key]) q.set(key, value[key]);
  return `?${q}`;
}

export function make(canvas: HTMLCanvasElement, view: View, opts: Opts = {}) {
  const value = tidy(SPEC, opts) as Knobs;
  const seed = Number.isFinite(opts.seed) ? opts.seed! : Math.floor(view.rand() * 4294967296);
  const one = sky(canvas, search(value, seed));
  const state = one.mood.state as Record<string, string>;
  let last = view.t;
  return {
    draw() {
      const dt = Math.min(STEP, Math.max(0, (view.t - last) / 1000));
      last = view.t;
      one.sky.step(dt);
      one.sky.paint();
    },
    size: () => one.sky.resize(),
    dive: () => one.sky.dive(),
    day: () => one.mood.set({ theme: state.theme === "light" ? "dark" : "light" }),
    turn: (kind: Turn) => {
      const list = TURNS[kind];
      one.mood.set({ [kind]: list[(list.indexOf(state[kind]!) + 1) % list.length], auto: false });
    },
    stop: () => {
      one.sky.pause();
      one.off();
    },
  };
}
