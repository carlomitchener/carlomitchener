import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { lambda } from "../site/kit/lambda.ts";

/* WHERE */

const DRY = process.env.DRY === "1";

/* SNAPSHOT */

const SHAPE: Record<string, (body: unknown) => unknown> = {
  "shop.json": (body) => (body as { products?: unknown })?.products ?? [],
  "feed.json": (body) => body ?? [],
};

function dataHash(site: string): string {
  const hash = createHash("sha256");
  for (const [name, take] of Object.entries(SHAPE)) {
    const path = join(site, "..", "..", "data", "carlomitchener", "site", name);
    hash.update(name);
    hash.update(existsSync(path) ? JSON.stringify(take(JSON.parse(readFileSync(path, "utf8")))) : "gone");
  }
  return hash.digest("hex").slice(0, 16);
}

/* SITE */

const shop = lambda({
  source: "carlomitchener/carlomitchener",
  head: "data/build/head",
  dir: "/tmp/src/carlomitchener",
  agent: "carlomitchener-site",
  bucket: "CARLOMITCHENER_BUCKET",
  folder: "site",
  local: "/tmp/carlomitchener",
  prepare: async (site, run) => {
    await run([process.execPath, "run", DRY ? "fake" : "snapshot"], site);
    return "";
  },
  hash: dataHash,
});

export default { fetch: shop.fetch };

/* MAIN */

if (import.meta.main) {
  const raw = process.argv[2] ?? process.env.EVENT ?? '{"source":"manual"}';
  console.log(await shop.once(shop.readEvent(raw)));
  process.exit(0);
}
