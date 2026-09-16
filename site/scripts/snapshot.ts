import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { feed, type ProductRow } from "../src/lib/shop.ts";
import { loadEnv, need } from "../src/lib/env.ts";
import { client, getText, putBytes } from "../../aws/s3.ts";
import { API, COUNTRY, LIVE_DAYS } from "../src/config/shop.ts";

loadEnv();

const org = resolve(import.meta.dir, "..");
const DATA_DIR = resolve(org, "../../data/carlomitchener/site");
const s3 = client(need("CARLOMITCHENER_BUCKET"));
const SHOP = "data/shop.json";
const INDEX = "site/cdn/feed/index.json";
const LOCAL = resolve(org, "../../data/carlomitchener/feed/index.json");

async function pull(key: string): Promise<string[]> {
  const local = join(DATA_DIR, "tasks", key, `${key}.json`);
  if (!existsSync(local)) {
    const found = await getText(s3, `data/tasks/${key}/${key}.json`);
    if (!found) {
      console.warn(`snapshot: no task for ${key}, no printfiles listed`);
      return [];
    }
    mkdirSync(join(DATA_DIR, "tasks", key), { recursive: true });
    writeFileSync(local, found);
  }
  try {
    const task = JSON.parse(readFileSync(local, "utf8"));
    return (task.printfiles ?? []).map((one: { name: string }) => one.name).filter(Boolean);
  } catch {
    return [];
  }
}

const rows: ProductRow[] = await feed({
  shop: need("SHOPIFY_SHOP_URL"),
  token: need("SHOPIFY_PUBLIC_ACCESS_TOKEN"),
  api: API,
  country: COUNTRY,
  live: LIVE_DAYS,
});

for (const row of rows) row.files = await pull(row.key);

const snapshot = { at: Date.now(), products: rows };
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
