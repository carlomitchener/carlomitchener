import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { CATEGORIES, LIVE_DAYS, type Catalog } from "../src/config/shop.ts";
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

/* SHAPES */

const SIZES: Record<string, string[]> = {
  accessories: ["One Size"],
  bags: ["One Size"],
  kids: ["2T", "3T", "4T", "5T", "6", "8", "10", "12"],
  men: ["XS", "S", "M", "L", "XL", "2XL"],
  unisex: ["XS", "S", "M", "L", "XL", "2XL"],
  women: ["XS", "S", "M", "L", "XL", "2XL"],
};

const PRICES: Record<string, [number, number]> = {
  accessories: [18, 32],
  bags: [24, 48],
  kids: [20, 34],
  men: [28, 64],
  unisex: [28, 64],
  women: [28, 64],
};

const MOCKUPS = [
  ["Flat", "Front"],
  ["Flat", "Back"],
  ["Flat", "Left"],
  ["Flat", "Right"],
  ["Lifestyle", "Worn"],
  ["Lifestyle", "Outdoors"],
  ["Detail", "Close"],
];

const STORIES = ["A still life that never settles.", "Two gliders meet and neither survives.", "The grid fills, then empties, then fills again.", "A loop of four, forever.", "Everything dies at generation ninety.", "One cell outlives them all."];

/* PRODUCTS */

const catalog = read(join(org, "../shop/files/catalog.json")) as Catalog[];
const slugs = new Set(CATEGORIES.map(([slug]) => slug));
const products: unknown[] = [];

for (const entry of catalog) {
  if (!slugs.has(entry.category)) continue;
  const sizes = SIZES[entry.category];
  const price = between(PRICES[entry.category]).toFixed(2);
  const mockups = MOCKUPS.slice(0, between([3, MOCKUPS.length]));
  const files = between([1, 3]);
  for (let n = 0; n < between(DEV_VARIATIONS); n++) {
    const key = hex();
    const stamp = Date.now() - next() * LIVE_DAYS * DAY;
    const names = Array.from({ length: files }, (_, i) => (files === 1 ? "printfile" : `printfile-${i + 1}`));
    products.push({
      key,
      type: String(entry.id),
      created: new Date(stamp).toISOString(),
      available: true,
      variants: sizes.map((size) => ({ id: String(4000000000000 + Math.floor(next() * 1000000000)), size, price, available: next() > 0.1 })),
      images: mockups.map(([category, title], i) => ({ url: picture(1200), alt: `${i + 1} - ${category} - ${title}`, style: String(i + 1) })),
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
      printfiles: names.map((name, i) => ({ id: String(i), key: hex(), name, url: `/cdn/printful/${key}/${name}.png`, width: 20, height: 20, dpi: 300 })),
      placements: [{ width: 20, height: 20, dpi: 300 }],
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
