import { existsSync, statSync } from "node:fs";
import { join } from "node:path";
import { DIST, HEADERS } from "./build.ts";

const LOCAL = { ...HEADERS, "Content-Security-Policy": HEADERS["Content-Security-Policy"]!.replace("; upgrade-insecure-requests", "") };

export function serve(port: number) {
  const file = (path: string) => {
    const want = join(DIST, path);
    return want.startsWith(DIST) && existsSync(want) && statSync(want).isFile() ? Bun.file(want) : null;
  };
  return Bun.serve({
    port,
    fetch(req) {
      const path = decodeURIComponent(new URL(req.url).pathname);
      if (!path.endsWith("/") && file(`${path}/index.html`)) return new Response(null, { status: 307, headers: { location: `${path}/` } });
      const hit = file(path.endsWith("/") ? `${path}index.html` : path) ?? file(`${path}.html`);
      const lost = hit ? null : file("/404.html");
      return new Response(hit ?? lost, { status: hit ? 200 : 404, headers: LOCAL });
    },
  });
}
