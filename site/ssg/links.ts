import { dirname, relative, resolve as under } from "node:path";
import { label, type Site } from "./build.ts";

/* TYPES */

export type Index = { base: string; map: Map<string, string> };

/* INDEX */

export function index(site: Site): Index {
  const roots = new Set(Object.values(site.inputs ?? {}).map((one) => one.path));
  const map = new Map<string, string>();
  const put = (file: string, route: string) => {
    if (!file) return;
    const name = label(site, file);
    map.set(file, route);
    if (name.includes("/") || roots.has(file)) map.set(name, route);
  };
  for (const route of site.routes) {
    if (route.source) put(route.source, route.route);
    for (const one of route.urls ?? []) if (one.source) put(one.source, one.route);
  }
  return { base: site.root, map };
}

/* STAMP */

export const stamp = (idx: Index) =>
  JSON.stringify([...idx.map].filter(([key]) => key.startsWith(idx.base)).map(([key, route]) => [key.slice(idx.base.length), route]));

/* RESOLVE */

const OUT = /^(https?:|mailto:|tel:|#|\/)/;

const keys = (path: string) => [path, `${path}.md`, path.replace(/\.md$/, "")];

const known = (idx: Index, path: string) => {
  for (const key of keys(path)) {
    const hit = idx.map.get(key);
    if (hit) return hit;
  }
  return "";
};

export function resolve(site: Site, from: string, url: string): string {
  const idx = site.index;
  if (!idx || OUT.test(url)) return url;
  const cut = url.search(/[#?]/);
  const tail = cut < 0 ? "" : url.slice(cut);
  const head = cut < 0 ? url : url.slice(0, cut);
  if (!head) return url;
  const file = under(idx.base, from);
  const target = under(dirname(file), head);
  const path = relative(idx.base, target);
  const hit = known(idx, target) || known(idx, path);
  return hit ? hit + tail : url;
}
