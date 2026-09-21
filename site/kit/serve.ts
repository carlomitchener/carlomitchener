import { extname } from "node:path";
import { globals, render, type Output, type Route, type Site, type Spec } from "./ssg/build.ts";

/* TYPES */

const TYPES: Record<string, string> = {
  html: "text/html; charset=utf-8",
  js: "text/javascript; charset=utf-8",
  mjs: "text/javascript; charset=utf-8",
  css: "text/css; charset=utf-8",
  json: "application/json",
  map: "application/json",
  webmanifest: "application/manifest+json",
  xml: "application/xml",
  txt: "text/plain; charset=utf-8",
  md: "text/markdown; charset=utf-8",
  tex: "text/plain; charset=utf-8",
  wasm: "application/wasm",
  svg: "image/svg+xml",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  ico: "image/x-icon",
  pdf: "application/pdf",
  woff2: "font/woff2",
  mp4: "video/mp4",
};

export const type = (path: string) => TYPES[extname(path).slice(1)] ?? "application/octet-stream";

export const reply = (item: Output, status = 200) =>
  new Response(item.bytes as string | Uint8Array, { status, headers: { "content-type": item.type ?? type(item.path) } });

/* PATHS */

export const clean = (path: string) =>
  path.startsWith("/") && !path.includes("\0") && !path.split("/").some((part) => part === "." || part === "..");

const file = (path: string) => (path.endsWith("/") ? `${path.slice(1)}index.html` : path.slice(1));

const owners = (site: Site, path: string) =>
  site.routes.filter((one) => one.route === path || one.urls?.some((url) => url.route === path));

const holder = (site: Site, path: string) =>
  site.routes
    .filter((one) => one.route.endsWith("/") && !one.urls && one.route !== path && path.startsWith(one.route))
    .sort((a, b) => b.route.length - a.route.length)[0] ?? null;

/* OUTPUTS */

async function seek(spec: Spec, site: Site, route: Route, want: string): Promise<Output | null> {
  const outputs = await render(site, route, spec);
  return outputs.find((item) => item.path === want) ?? null;
}

const shared = new WeakMap<Site, Promise<Map<string, Output>>>();

function extras(spec: Spec, site: Site) {
  let hit = shared.get(site);
  if (!hit) {
    hit = globals(site, spec).then((list) => new Map(list.map((item) => [item.path, item])));
    shared.set(site, hit);
  }
  return hit;
}

/* SERVE */

export async function find(spec: Spec, site: Site, path: string): Promise<Response | null> {
  if (!clean(path)) return null;
  if (!path.endsWith("/") && site.routes.some((one) => one.route === `${path}/`)) return Response.redirect(`${path}/`, 302);
  const want = file(path);
  const tried = owners(site, path);
  for (const route of tried) {
    const hit = await seek(spec, site, route, want);
    if (hit) return reply(hit);
  }
  const copy = (await extras(spec, site)).get(want);
  if (copy) return reply(copy);
  const above = holder(site, path);
  if (above && !tried.includes(above)) {
    const hit = await seek(spec, site, above, want);
    if (hit) return reply(hit);
  }
  return null;
}

export async function lost(spec: Spec, site: Site): Promise<Response> {
  const route = site.routes.find((one) => one.route === "/404.html");
  const hit = route ? await seek(spec, site, route, "404.html") : null;
  return hit ? reply(hit, 404) : new Response("not found", { status: 404 });
}

export async function serve(spec: Spec, site: Site, path: string): Promise<Response> {
  return (await find(spec, site, path)) ?? (await lost(spec, site));
}
