import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { LIVE_DAYS, type Catalog } from "../src/config/shop.ts";
import { DEV_DIR, DEV_POSTS, DEV_SEED, DEV_VARIATIONS, PICSUM, PICSUM_POOL } from "../src/config/dev.ts";

const org = resolve(import.meta.dir, "..");
const DATA_DIR = resolve(org, "../../data/carlomitchener/site", DEV_DIR);
const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

/* RANDOM */

let state = DEV_SEED;

function next() {
  state = (state * 1103515245 + 12345) % 2147483648;
  return state / 2147483648;
}

const between = ([lo, hi]: [number, number]) => lo + Math.floor(next() * (hi - lo + 1));

const pick = <T>(list: T[]) => list[Math.floor(next() * list.length)];

const hex = () => Array.from({ length: 8 }, () => "0123456789abcdef"[Math.floor(next() * 16)]).join("");

const read = (path: string) => JSON.parse(readFileSync(path, "utf8"));

const write = (path: string, body: unknown) => {
  mkdirSync(join(path, ".."), { recursive: true });
  writeFileSync(path, JSON.stringify(body, null, 2) + "\n");
};

/* PICTURES */

const pool = Array.from({ length: between(PICSUM_POOL) }, () => hex());

const picture = (size: number) => `${PICSUM}/${pick(pool)}/${size}/${size}`;

/* SPECS */

type Spec = {
  id: number;
  variants: { id: number; size: string; cost: string; is_ignored: boolean }[];
  mockups: { id: number; category: string; title: string; is_ignored: boolean }[];
  placements: { width: number; height: number; dpi: number; is_ignored: boolean }[];
};

const spec = (id: number): Spec | null => {
  const path = join(org, "../shop/files/products", `${id}.json`);
  return existsSync(path) ? (read(path) as Spec) : null;
};

const STORIES = ["A still life that never settles.", "Two gliders meet and neither survives.", "The grid fills, then empties, then fills again.", "A loop of four, forever.", "Everything dies at generation ninety.", "One cell outlives them all."];

/* PRODUCTS */

const catalog = read(join(org, "../shop/files/catalog.json")) as Catalog[];
const products: unknown[] = [];

for (const entry of catalog) {
  const source = spec(entry.id);
  if (!source) {
    console.warn(`fake: no spec for ${entry.id} ${entry.title}, skipped`);
    continue;
  }
  const variants = source.variants.filter((v) => !v.is_ignored).filter((v, i, all) => all.findIndex((o) => o.size === v.size) === i);
  const mockups = source.mockups.filter((m) => !m.is_ignored);
  const placements = new Map<string, { width: number; height: number; dpi: number }>();
  for (const place of source.placements.filter((one) => !one.is_ignored)) {
    const id = `${Math.round(place.width * 100)}-${Math.round(place.height * 100)}-${Math.round(place.dpi)}`;
    if (!placements.has(id)) placements.set(id, place);
  }
  if (!variants.length || !mockups.length || !placements.size) {
    console.warn(`fake: ${entry.id} ${entry.title} has no live variant, mockup or placement, skipped`);
    continue;
  }
  const names = [...placements.keys()].map((_, i, all) => (all.length === 1 ? "printfile" : `printfile-${i + 1}`));
  for (let n = 0; n < between(DEV_VARIATIONS); n++) {
    const key = hex();
    const stamp = Date.now() - next() * LIVE_DAYS * DAY;
    products.push({
      key,
      type: String(entry.id),
      created: new Date(stamp).toISOString(),
      available: true,
      variants: variants.map((v) => ({ id: String(4000000000000 + Math.floor(next() * 1000000000)), size: v.size, price: Number(v.cost).toFixed(2), available: next() > 0.1 })),
      images: mockups.map((m) => ({ url: picture(1200), alt: `${m.id} - ${m.category} - ${m.title}`, style: String(m.id) })),
      files: names,
    });
    write(join(DATA_DIR, "tasks", key, `${key}.json`), {
      key,
      step: "ARCHIVE",
      seed: Math.floor(next() * 1000000),
      created_at: stamp,
      updated_at: stamp,
      product: { id: entry.id, category: entry.category, title: entry.title },
      variation: {},
      printfiles: [...placements.values()].map((place, i) => ({ id: String(i), key: hex(), name: names[i], url: `/cdn/printful/${key}/${names[i]}.png`, width: place.width, height: place.height, dpi: place.dpi })),
      placements: [...placements.values()],
      variants: [],
      mockups: [],
      metadata: {},
    });
  }
}

write(join(DATA_DIR, "shop.json"), { at: Date.now(), products });
console.log(`fake: ${products.length} products from ${catalog.length} catalog rows into ${join(DATA_DIR, "shop.json")}`);

/* FEED */

let at = Date.now();
const posts = Array.from({ length: DEV_POSTS }, (_, n) => {
  at -= next() * DAY;
  const canvas = pick([40, 60, 80, 120, 160]);
  const duration = Number((4 + next() * 26).toFixed(3));
  return {
    name: hex(),
    seed: Math.floor(next() * 4294967296),
    at: new Date(at).toISOString(),
    duration,
    frames: Math.round(duration * 30),
    size: Math.max(640, canvas * 4),
    segments: between([1, 6]),
    canvas,
    story: `${pick(STORIES)} Post ${n + 1}.`,
  };
});
write(join(DATA_DIR, "feed.json"), posts);
write(join(DATA_DIR, "picsum.json"), pool);
console.log(`fake: ${posts.length} posts and ${pool.length} pictures into ${DATA_DIR}`);
