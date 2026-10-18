import { watch } from "node:fs";
import { join } from "node:path";
import { REPO, SITE, build } from "./build.ts";
import { serve } from "./serve.ts";

const PORT = Number(process.env.PORT ?? 3000);

let timer: Timer | undefined;
const again = () => {
  clearTimeout(timer);
  timer = setTimeout(() => build().catch((error) => console.error(error)), 80);
};

await build();
for (const path of [join(REPO, "README.md"), join(REPO, "avatar"), join(SITE, "src"), join(SITE, "public")]) watch(path, { recursive: true }, again);
serve(PORT);
console.log(`site: http://127.0.0.1:${PORT}/, rebuilds on README, avatar/ and site/src/ edits; Ctrl-C stops it`);
