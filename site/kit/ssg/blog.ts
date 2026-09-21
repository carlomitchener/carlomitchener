import { join, relative } from "node:path";
import { mime, reads } from "../git/git.ts";
import { front } from "./md.ts";
import { bytes, type Bytes, type Input, type Output, type Route, type Site, type Spec } from "./build.ts";

/* TYPES */

export type Card = {
  slug: string;
  route: string;
  title: string;
  date: string;
  lead: string;
  image: string;
  front: Record<string, string>;
};

export type Post = Card & { body: string; dir: string; source: string; names: string[] };

export type Leaf = {
  route: string;
  kind: "blog" | "post";
  name: string;
  description: string;
  body: string;
  slug: string;
  date: string;
  lead: string;
  image: string;
  front: Record<string, string>;
  posts: Card[];
  out: Output[];
};

export type Hooks = {
  page?: (site: Site, leaf: Leaf) => Bytes;
  md?: (site: Site, text: string, from: string, out: Output[]) => string;
};

export type Drawn = Hooks & { page: NonNullable<Hooks["page"]> };

/* RULES */

const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;

const DATE = /^\d{4}-\d{2}-\d{2}$/;

const FIGURE = /!\[[^\]]*\]\(\s*<?([^)\s>]+)/;

const AWAY = /^(?:[a-z][a-z0-9+.-]*:|\/|#)/i;

const NEEDS = ["title", "date", "lead"] as const;

export const BLOG = "/blog/";

export const postRoute = (slug: string) => `${BLOG}${slug}/`;

export const isBlog = (route: Route) =>
  route.kind === "blog" || route.kind === "blogpost" || route.kind === "blogfiles";

/* INPUT */

function home(site: Site): Input | null {
  if (!site.config.inputs?.blog) return null;
  const one = site.input("blog");
  return one.missing || !one.files.length ? null : one;
}

/* FIGURE */

function tidy(url: string): string {
  const cut = url.search(/[#?]/);
  const out: string[] = [];
  for (const part of (cut < 0 ? url : url.slice(0, cut)).split("/")) {
    if (part === "" || part === ".") continue;
    if (part !== "..") out.push(part);
    else if (out.length) out.pop();
    else return "";
  }
  return out.join("/");
}

function shown(body: string, names: Set<string>, slug: string): string {
  const hit = body.match(FIGURE);
  if (!hit) return "";
  const url = hit[1]!;
  if (AWAY.test(url)) return "";
  const path = tidy(url);
  if (path && names.has(path)) return `${postRoute(slug)}${path}`;
  return SLUG.test(url) ? url : "";
}

/* POSTS */

const POSTS = new WeakMap<Site, Post[]>();

function gather(one: Input): Post[] {
  const groups = new Map<string, string[]>();
  for (const file of one.files) {
    const path = relative(one.path, file);
    const cut = path.indexOf("/");
    if (cut < 0) throw new Error(`blog: ${path} sits loose in the blog folder; a post is <slug>/index.md with its files beside it`);
    const slug = path.slice(0, cut);
    const list = groups.get(slug);
    if (list) list.push(path.slice(cut + 1));
    else groups.set(slug, [path.slice(cut + 1)]);
  }
  const out: Post[] = [];
  for (const slug of [...groups.keys()].sort()) {
    if (!SLUG.test(slug)) throw new Error(`blog: ${slug} is not a slug; use lowercase words and digits joined by hyphens`);
    const inner = groups.get(slug)!.sort();
    if (!inner.includes("index.md")) throw new Error(`blog: ${slug} has no index.md`);
    const dir = join(one.path, slug);
    const source = join(dir, "index.md");
    const { data, body } = front(new TextDecoder().decode(bytes(source)));
    for (const key of NEEDS) if (!data[key]) throw new Error(`blog: ${slug} names no ${key} in its front matter`);
    if (!DATE.test(data.date!)) throw new Error(`blog: ${slug} dates itself ${data.date}; a date is YYYY-MM-DD`);
    const names = inner.filter((path) => path !== "index.md");
    out.push({
      slug,
      route: postRoute(slug),
      title: data.title!,
      date: data.date!,
      lead: data.lead!,
      image: shown(body, new Set(names), slug),
      front: data,
      body,
      dir,
      source,
      names,
    });
  }
  return out.sort((a, b) => (a.date === b.date ? a.slug.localeCompare(b.slug) : a.date < b.date ? 1 : -1));
}

export function posts(site: Site): Post[] {
  const hit = POSTS.get(site);
  if (hit) return hit;
  const one = home(site);
  const list = one ? gather(one) : [];
  POSTS.set(site, list);
  return list;
}

const card = (one: Post): Card => ({
  slug: one.slug,
  route: one.route,
  title: one.title,
  date: one.date,
  lead: one.lead,
  image: one.image,
  front: one.front,
});

/* COLLECT */

export function collect(site: Site): { routes: Route[] } {
  const list = posts(site);
  if (!list.length) return { routes: [] };
  const routes: Route[] = [
    {
      route: BLOG,
      kind: "blog",
      name: "Blog",
      data: list.map((one) => one.slug),
      source: home(site)!.path,
      inputs: list.map((one) => one.source),
      at: list[0]!.date,
    },
  ];
  for (const one of list) {
    routes.push({
      route: one.route,
      kind: "blogpost",
      name: one.title,
      data: { slug: one.slug, image: one.image },
      source: one.source,
      inputs: [one.source],
      at: one.date,
    });
    if (!one.names.length) continue;
    for (const path of one.names) site.ships.set(join(one.dir, path), `${one.route}${path}`);
    routes.push({
      route: `${one.route}@files`,
      kind: "blogfiles",
      name: one.slug,
      data: { slug: one.slug },
      inputs: [one.dir],
      hidden: true,
      urls: one.names
        .filter((path) => !path.endsWith(".md"))
        .map((path) => ({ route: `${one.route}${path}`, name: path, source: join(one.dir, path), at: one.date })),
    });
  }
  return { routes };
}

/* RENDER */

const only = (list: Post[], slug: string) => {
  const hit = list.find((one) => one.slug === slug);
  if (!hit) throw new Error(`blog: no post named ${slug}`);
  return hit;
};

export function render(site: Site, route: Route, spec: Spec): Output[] {
  const hooks = spec.blog as Drawn | undefined;
  if (!hooks?.page) throw new Error("blog: the site declares a blog input but the spec carries no blog.page");
  const list = posts(site);
  const { slug } = (route.data ?? {}) as { slug?: string };
  if (route.kind === "blogfiles") {
    const one = only(list, slug!);
    return one.names.map((path) => {
      const body = bytes(join(one.dir, path));
      return { path: `blog/${one.slug}/${path}`, bytes: body, type: mime(path, reads(body) !== null) };
    });
  }
  const out: Output[] = [];
  const leaf: Leaf = {
    route: route.route,
    kind: "blog",
    name: route.name ?? "Blog",
    description: "",
    body: "",
    slug: "",
    date: list[0]?.date ?? "",
    lead: "",
    image: "",
    front: {},
    posts: list.map(card),
    out,
  };
  if (route.kind === "blog") {
    out.push({ path: "blog/index.html", bytes: hooks.page(site, leaf) });
    return out;
  }
  const one = only(list, slug!);
  const body = hooks.md ? hooks.md(site, one.body, one.source, out) : one.body;
  const post: Leaf = { ...leaf, kind: "post", name: one.title, description: one.lead, body, slug: one.slug, date: one.date, lead: one.lead, image: one.image, front: one.front };
  out.push({ path: `blog/${one.slug}/index.html`, bytes: hooks.page(site, post) });
  return out;
}
