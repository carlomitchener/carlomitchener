import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";

const DESK = resolve(import.meta.dir, "../../..");

export function loadEnv(path = join(DESK, ".env")) {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const clean = line.trim();
    if (!clean || clean.startsWith("#")) continue;
    const at = clean.indexOf("=");
    if (at < 0) continue;
    const key = clean.slice(0, at).trim();
    if (process.env[key]) continue;
    process.env[key] = clean.slice(at + 1).trim();
  }
}

export function need(key: string) {
  const value = process.env[key];
  if (!value) throw new Error(`site: ${key} is not in .env`);
  return value;
}
