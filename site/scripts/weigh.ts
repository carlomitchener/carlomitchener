import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

const dist = resolve(process.argv[2] ?? "dist");
const routes = process.argv.slice(3);

const LINK = /<link rel="stylesheet" href="([^"]+)"/g;
const SRC = /<script type="module" src="([^"]+)"/g;
const IMPORT = /\b(?:import|export)\s*(?:\{[^}]*\}|\*\s*as\s+[\w$]+|[\w$]+)?\s*(?:from\s*)?["']([^"']+)["']/g;

const at = (path: string) => join(dist, path.replace(/^\//, ""));
const size = (path: string) => (existsSync(at(path)) ? readFileSync(at(path)).length : 0);
const sum = (list: string[]) => list.reduce((n, one) => n + size(one), 0);
const kb = (n: number) => (n / 1024).toFixed(1).padStart(8);

function closure(entry: string): string[] {
  const seen = new Set<string>();
  const todo = [entry];
  while (todo.length) {
    const one = todo.pop()!;
    if (seen.has(one) || !existsSync(at(one))) continue;
    seen.add(one);
    for (const [, spec] of readFileSync(at(one), "utf8").matchAll(IMPORT)) todo.push(join(dirname(one), spec));
  }
  return [...seen];
}

console.log("route".padEnd(30) + "    HTML     CSS      JS  files");
for (const route of routes) {
  const file = route.endsWith(".html") ? route : `${route}index.html`;
  if (!existsSync(at(file))) {
    console.log(`${route.padEnd(30)}  missing`);
    continue;
  }
  const html = readFileSync(at(file), "utf8");
  const js = [...new Set([...html.matchAll(SRC)].flatMap((one) => closure(one[1])))];
  console.log(`${route.padEnd(30)}${kb(size(file))}${kb(sum([...html.matchAll(LINK)].map((one) => one[1])))}${kb(sum(js))}  ${js.length}`);
}
