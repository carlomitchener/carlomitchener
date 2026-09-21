import { describe, expect, test } from "bun:test";
import { readFileSync, readdirSync } from "node:fs";
import { join, relative, resolve } from "node:path";

const KIT = resolve(import.meta.dir, "..");

const READS = /var\(\s*(--[a-z0-9-]+)/g;

const DECLARES = /(--[a-z0-9-]+)\s*:/g;

const sheets = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true })
    .flatMap((item) => (item.isDirectory() ? sheets(join(dir, item.name)) : item.name.endsWith(".css") ? [join(dir, item.name)] : []))
    .sort();

const read: { name: string; where: string }[] = [];
for (const file of sheets(KIT)) {
  const where = relative(KIT, file);
  for (const hit of readFileSync(file, "utf8").matchAll(READS)) read.push({ name: hit[1], where });
}

const declared = (leaf: string) => new Set([...readFileSync(join(KIT, leaf), "utf8").matchAll(DECLARES)].map((hit) => hit[1]));

const contract = declared("code/contract.css");

const palette = declared("palette.css");

const names = [...new Set(read.map((one) => one.name))].sort();

describe("contract", () => {
  test("every name the kit's CSS reads is declared by the contract or the palette", () => {
    console.log(names.join("\n"));
    const loose = read.filter((one) => !contract.has(one.name) && !palette.has(one.name));
    const wild = loose.filter((one) => !(one.where === "code/contract.css" && one.name.startsWith("--site-")));
    expect(wild.map((one) => `${one.where} reads ${one.name}`).sort()).toEqual([]);
  });

  test("the contract declares no kit name the kit's CSS never reads", () => {
    const live = new Set(names);
    const dead = [...contract].filter((name) => name.startsWith("--kit-") && !live.has(name)).sort();
    expect(dead).toEqual([]);
  });
});
