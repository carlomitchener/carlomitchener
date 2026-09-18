import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { facetsOf, feed, GIFT_PREFIX, type Batch, type Facets, type ProductRow } from "../src/lib/shop.ts";
import { loadEnv, need } from "../src/lib/env.ts";
import { client, getText, list, putBytes } from "../../aws/s3.ts";
import { API, COUNTRY, LIVE_DAYS } from "../src/config/shop.ts";

loadEnv();

const org = resolve(import.meta.dir, "..");
const DATA_DIR = resolve(org, "../../data/carlomitchener/site");
const s3 = client(need("CARLOMITCHENER_BUCKET"));
const SHOP = "data/shop.json";
const BATCHES = "data/automator/batches/";
const INDEX = "site/cdn/feed/index.json";
const LOCAL = resolve(org, "../../data/carlomitchener/feed/index.json");

async function pull(key: string): Promise<Facets | null> {
  const local = join(DATA_DIR, "tasks", `${key}.json`);
  if (!existsSync(local)) {
    const found = await getText(s3, `data/automator/tasks/${key}.json`);
    if (!found) {
      console.warn(`snapshot: no task for ${key}, no printfiles listed`);
      return null;
    }
    mkdirSync(join(DATA_DIR, "tasks"), { recursive: true });
    writeFileSync(local, found);
  }
  try {
    return facetsOf(JSON.parse(readFileSync(local, "utf8")));
  } catch {
    return null;
  }
}

const stamp = (seconds: number) => new Date(seconds * 1000).toISOString();

async function batches(): Promise<Batch[]> {
  const keys = (await list(s3, BATCHES)).filter((key) => key.endsWith(".json"));
  const out: Batch[] = [];
  for (const key of keys) {
    const text = await getText(s3, key);
    const data = text ? JSON.parse(text) : null;
    if (!data?.design || !data.released_at) continue;
    out.push({ design: data.design, created: stamp(data.created_at), released: stamp(data.released_at) });
  }
  return out.sort((a, b) => (a.released < b.released ? 1 : -1));
}

const released = await batches();
const byDesign = new Map(released.map((batch) => [batch.design, batch]));

const all: ProductRow[] = await feed({
  shop: need("SHOPIFY_SHOP_URL"),
  token: need("SHOPIFY_PUBLIC_ACCESS_TOKEN"),
  api: API,
  country: COUNTRY,
  live: LIVE_DAYS * 2,
});

let pending = 0;
for (const row of all) {
  const batch = byDesign.get(row.design);
  row.released = batch ? batch.released : "";
  if (!batch && !row.key.startsWith(GIFT_PREFIX)) pending += 1;
}
const rows = all;
console.log(`snapshot: ${released.length} released batches, ${pending} products pending`);

await Promise.all(
  rows.map(async (row) => {
    const facets = await pull(row.key);
    if (facets) Object.assign(row, facets);
  }),
);

const snapshot = { at: Date.now(), products: rows, batches: released };
const path = join(DATA_DIR, "shop.json");
const body = JSON.stringify(snapshot, null, 2) + "\n";
mkdirSync(DATA_DIR, { recursive: true });
writeFileSync(path, body);
console.log(`snapshot: ${rows.length} products into ${path}`);

/* FEED */

async function readFeed(): Promise<unknown[]> {
  const found = await getText(s3, INDEX);
  const text = found ?? (existsSync(LOCAL) ? readFileSync(LOCAL, "utf8") : "[]");
  const rows_ = JSON.parse(text);
  if (!Array.isArray(rows_)) throw new Error(`snapshot: ${found ? INDEX : LOCAL} is not an array`);
  console.log(`snapshot: posts from ${found ? `s3://${need("CARLOMITCHENER_BUCKET")}/${INDEX}` : LOCAL}`);
  return rows_;
}

const posts = await readFeed();
const index = join(DATA_DIR, "feed.json");
writeFileSync(index, JSON.stringify(posts, null, 2) + "\n");
console.log(`snapshot: ${posts.length} posts into ${index}`);

if (process.argv.includes("--upload")) {
  await putBytes(s3, SHOP, body, { type: "application/json", cacheControl: "no-store" });
  console.log(`snapshot: uploaded to s3://${need("CARLOMITCHENER_BUCKET")}/${SHOP}`);
}
