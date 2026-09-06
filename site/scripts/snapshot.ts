import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { feed, type ProductRow } from "../lib/shop.ts";
import { loadEnv, need } from "../lib/env.ts";
import site from "../site.json";

loadEnv();

const org = resolve(import.meta.dir, "..");
const data = join(org, "data");
const BUCKET = need("CARLOMITCHENER_BUCKET");

function pull(key: string): string[] {
  const local = join(data, "tasks", key, `${key}.json`);
  if (!existsSync(local)) {
    mkdirSync(join(data, "tasks", key), { recursive: true });
    const done = Bun.spawnSync(["aws", "s3", "cp", `s3://${BUCKET}/data/tasks/${key}/${key}.json`, local], { stderr: "pipe" });
    if (done.exitCode !== 0) {
      console.warn(`snapshot: no task for ${key}, no printfiles listed`);
      return [];
    }
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

for (const row of rows) row.files = pull(row.key);

const snapshot = { at: Date.now(), products: rows };
const path = join(data, "shop.json");
mkdirSync(data, { recursive: true });
writeFileSync(path, JSON.stringify(snapshot, null, 2) + "\n");
console.log(`snapshot: ${rows.length} products into data/shop.json`);

if (process.argv.includes("--upload")) {
  const done = Bun.spawnSync(["aws", "s3", "cp", path, `s3://${BUCKET}/data/shop.json`, "--content-type", "application/json"], { stdout: "inherit", stderr: "inherit" });
  if (done.exitCode !== 0) throw new Error("snapshot: upload failed");
  console.log(`snapshot: uploaded to s3://${BUCKET}/data/shop.json`);
}
