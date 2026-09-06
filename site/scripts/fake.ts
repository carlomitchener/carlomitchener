import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import site from "../site.json";

const org = resolve(import.meta.dir, "..");
const shop = resolve(org, "../shop");
const data = join(org, "data");
const DESIGNS = Number(process.env.FAKE_DESIGNS ?? 2);
const HOUR = 60 * 60 * 1000;
const CDN = "https://cdn.shopify.com/s/files/1/0000/0001/files";

let state = 20260906;

function next() {
  state = (state * 1103515245 + 12345) % 2147483648;
  return state / 2147483648;
}

const hex = () => Array.from({ length: 8 }, () => "0123456789abcdef"[Math.floor(next() * 16)]).join("");

const read = (path: string) => JSON.parse(readFileSync(path, "utf8"));

const write = (path: string, body: unknown) => {
  mkdirSync(join(path, ".."), { recursive: true });
  writeFileSync(path, JSON.stringify(body, null, 2) + "\n");
};

const catalog = read(join(shop, "files", "catalog.json")) as { id: number; category: string; title: string }[];
const products: unknown[] = [];
let stamp = Date.now();

for (const entry of catalog) {
  const file = join(shop, "data", "products", `${entry.id}.json`);
  if (!existsSync(file)) {
    console.warn(`fake: no product json for ${entry.id}, skipped`);
    continue;
  }
  const source = read(file);
  const live = (source.variants ?? []).filter((v: { is_ignored: boolean }) => !v.is_ignored);
  const variants = (live.length ? live : source.variants ?? []).filter(
    (v: { size: string }, i: number, all: { size: string }[]) => all.findIndex((o) => o.size === v.size) === i,
  );
  const mockups = (source.mockups ?? []).filter((m: { is_ignored: boolean }) => !m.is_ignored);
  const placements = new Map<string, { width: number; height: number; dpi: number }>();
  for (const place of source.placements ?? []) {
    const id = `${Math.round(place.width * 100)}-${Math.round(place.height * 100)}-${Math.round(place.dpi)}`;
    if (!placements.has(id)) placements.set(id, place);
  }
  if (!variants.length || !mockups.length) {
    console.warn(`fake: ${entry.id} has no live variants or mockups, skipped`);
    continue;
  }
  for (let n = 0; n < DESIGNS; n++) {
    const key = hex();
    stamp -= HOUR;
    const created = new Date(stamp).toISOString();
    const files = [...placements.keys()].map((id) => ({ id, key: hex(), name: "", url: "" }));
    for (const one of files) {
      one.name = `${key}-${one.key}`;
      one.url = `${site.root}/art/${key}/${one.name}.png`;
    }
    products.push({
      key,
      type: String(entry.id),
      created,
      available: true,
      variants: variants.map((v: { id: number; size: string; cost: string }) => ({
        id: String(4000000000000 + Math.floor(next() * 1000000000)),
        size: v.size,
        price: Number(v.cost || "20").toFixed(2),
        available: true,
      })),
      images: mockups.map((m: { id: number; category: string; title: string }) => {
        const name = `${key}-${hex()}`;
        return { url: `${CDN}/${name}.png?v=1`, alt: `${m.id} - ${m.category} - ${m.title}`, style: String(m.id) };
      }),
      files: files.map((one) => one.name),
    });
    write(join(data, "tasks", key, `${key}.json`), {
      key,
      step: "ARCHIVE",
      seed: Math.floor(next() * 1000000),
      created_at: stamp,
      updated_at: stamp,
      product: { id: entry.id, category: entry.category, title: entry.title },
      variation: {},
      printfiles: files.map((one) => ({ ...one, width: 20, height: 20, dpi: 300 })),
      placements: [...placements.values()],
      variants: [],
      mockups: [],
      metadata: {},
    });
  }
}

write(join(data, "shop.json"), { at: Date.now(), products });
console.log(`fake: ${products.length} products from ${catalog.length} catalog rows into data/shop.json`);
