import { dirname, isAbsolute, relative, resolve as under } from "node:path";
import { config as gitConfig, dirRoute, isGit, link as gitLink, owner } from "../git/git.ts";
import { label, type Site } from "./build.ts";

/* TYPES */

export type Index = { base: string; slug: string; branch: string; map: Map<string, string>; git: Set<string> };

/* INDEX */

export function index(site: Site): Index {
  const git = gitConfig(site);
  const roots = new Set(Object.values(site.inputs ?? {}).map((one) => one.path));
  const map = new Map<string, string>();
  const put = (file: string, route: string) => {
    if (!file) return;
    const name = label(site, file);
    map.set(file, route);
    if (name.includes("/") || roots.has(file)) map.set(name, route);
  };
  for (const route of site.routes) {
    if (isGit(route)) continue;
    if (route.source) put(route.source, route.route);
    for (const one of route.urls ?? []) if (one.source) put(one.source, one.route);
  }
  return {
    base: git?.root ?? site.root,
    slug: git?.slug ?? "",
    branch: git?.branch ?? "main",
    map,
    git: new Set(site.routes.filter(isGit).map((route) => route.route)),
  };
}

/* STAMP */

export const stamp = (idx: Index) =>
  JSON.stringify([
    [...idx.map].filter(([key]) => key.startsWith(idx.base)).map(([key, route]) => [key.slice(idx.base.length), route]),
    [...idx.git],
  ]);

/* RESOLVE */

const OUT = /^(https?:|mailto:|tel:|#|\/)/;

const DENY = /^(?:javascript|data|vbscript):/i;

const denied = (url: string) => DENY.test(url.replace(/[\u0000-\u0020]/g, ""));

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
  if (denied(url)) return "#";
  if (!idx || OUT.test(url)) return url;
  const cut = url.search(/[#?]/);
  const tail = cut < 0 ? "" : url.slice(cut);
  const head = cut < 0 ? url : url.slice(0, cut);
  if (!head) return url;
  const file = under(idx.base, from);
  const target = under(dirname(file), head);
  const path = relative(idx.base, target);
  const hit = known(idx, target) || known(idx, path);
  if (hit) return hit + tail;
  if (!path || path.startsWith("..") || isAbsolute(path)) return url;
  if (idx.git.size) {
    const where = gitLink(relative(idx.base, dirname(file)), head);
    const page = where.startsWith("/raw/") ? (owner(where) ?? "") : where;
    if (idx.git.has(page)) return where + tail;
    return idx.git.has(dirRoute(path)) ? dirRoute(path) + tail : url;
  }
  return idx.slug ? `https://github.com/${idx.slug}/blob/${idx.branch}/${path}${tail}` : url;
}
