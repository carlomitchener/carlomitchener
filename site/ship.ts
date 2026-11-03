import { writeFileSync } from "node:fs";
import { join, relative } from "node:path";
import { HEADERS, POLICY, REPO, headers } from "./build.ts";
import { DIST, build } from "./net/build.ts";

export const NET_POLICY = [
  ...POLICY.map((rule) => (rule === "script-src 'self'" ? `${rule} 'wasm-unsafe-eval'` : rule)),
  "font-src 'self' data:",
];

export const NET_HEADERS: Record<string, string> = { ...HEADERS, "Content-Security-Policy": NET_POLICY.join("; ") };

if (import.meta.main) {
  const code = await build();
  if (code) process.exit(code);
  writeFileSync(join(DIST, "_headers"), headers(NET_HEADERS));
  console.log(`site: wrote ${relative(REPO, join(DIST, "_headers"))}`);
}
