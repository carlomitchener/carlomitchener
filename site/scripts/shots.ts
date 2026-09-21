import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { main } from "../kit/shots.ts";

const root = resolve(import.meta.dir, "..");

if (import.meta.main) await main(root, JSON.parse(readFileSync(join(root, "site.json"), "utf8")));
