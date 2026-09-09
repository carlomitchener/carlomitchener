import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { feed, type ProductRow } from "../lib/shop.ts";
import { loadEnv, need } from "../lib/env.ts";
import { client, getText, putBytes } from "../../aws/s3.ts";
import site from "../site.json";

loadEnv();

const org = resolve(import.meta.dir, "..");
const data = join(org, "data");
const s3 = client(need("CARLOMITCHENER_BUCKET"));
const SHOP = "data/shop.json";

async function pull(key: string): Promise<string[]> {
  const local = join(data, "tasks", key, `${key}.json`);
  if (!existsSync(local)) {
    const found = await getText(s3, `data/tasks/${key}/${key}.json`);
    if (!found) {
      console.warn(`snapshot: no task for ${key}, no printfiles listed`);
      return [];
    }
    mkdirSync(join(data, "tasks", key), { recursive: true });
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
  api: site.api,
  country: site.country,
  live: site.live,
});

for (const row of rows) row.files = await pull(row.key);

const snapshot = { at: Date.now(), products: rows };
const path = join(data, "shop.json");
const body = JSON.stringify(snapshot, null, 2) + "\n";
mkdirSync(data, { recursive: true });
writeFileSync(path, body);
console.log(`snapshot: ${rows.length} products into data/shop.json`);

if (process.argv.includes("--upload")) {
  await putBytes(s3, SHOP, body, { type: "application/json", cacheControl: "no-store" });
  console.log(`snapshot: uploaded to s3://${need("CARLOMITCHENER_BUCKET")}/${SHOP}`);
}
