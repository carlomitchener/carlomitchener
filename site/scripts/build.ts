import { readFileSync } from "node:fs";
import { basename, join, resolve } from "node:path";
import { createElement as h } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { build, page, type Config, type Output, type Route, type Site, type Spec } from "../ssg/build.ts";
import { resolve as resolveLink } from "../ssg/links.ts";
import { CATEGORIES, LIVE_DAYS, PRINTFUL, TILES, type Catalog } from "../src/config/shop.ts";
import { DEV, DEV_DIR } from "../src/config/dev.ts";
import { loadEnv } from "../src/lib/env.ts";
import { sheet } from "../src/lib/md.ts";
import { FEED_ROUTE, postMaster, postPoster, postRoute, posts, type Post } from "../src/lib/feed.ts";
import { grid, ogUrl, type ProductRow } from "../src/lib/shop.ts";
import { Page } from "../src/components/Page.jsx";
import { Home } from "../src/pages/Home.jsx";
import { Shop } from "../src/pages/Shop.jsx";
import { Product } from "../src/pages/Product.jsx";
import { Post as PostPage } from "../src/pages/Post.jsx";
import { Feed } from "../src/pages/Feed.jsx";
import { Cart } from "../src/pages/Cart.jsx";
import { Doc } from "../src/pages/Doc.jsx";
import { NotFound } from "../src/pages/NotFound.jsx";
import site from "../site.json";

loadEnv();

const org = resolve(import.meta.dir, "..");
const dist = join(org, "dist");
const client = join(org, ".cache", "client");
const root = (process.env.SITE_URL ?? site.root).replace(/\/$/, "");
const SHOP = DEV ? "" : (process.env.SHOPIFY_SHOP_URL ?? "");
const FALLBACK = `${root}/bird/bird-512.png`;

const read = (path: string) => readFileSync(path, "utf8");

const today = () => new Date().toISOString().slice(0, 10);

const now = Date.now();

/* TYPES */

type Row = ProductRow & { title: string; category: string; handle: string; link: string; price: string; variant: string };

type Crumb = { name: string; href?: string };

type Card = { name: string; href: string; count: number };

type Leaf = {
  route: string;
  name: string;
  description: string;
  image?: string;
  type?: string;
  meta?: Record<string, string>[];
  data?: object;
  noindex?: boolean;
  fly?: boolean;
};

/* CLIENT */

async function bundle() {
  const out = await Bun.build({
    entrypoints: [join(org, "src", "client", "main.ts")],
    outdir: client,
    naming: "[name].[ext]",
    minify: true,
    define: { SHOP: JSON.stringify(SHOP) },
  });
  if (!out.success) throw new Error(`site: client bundle failed\n${out.logs.map(String).join("\n")}`);
}

/* SHELL */

let catalogRows: Catalog[] = [];

function shell(site_: Site, leaf: Leaf, body: unknown) {
  const node = h(
    Page,
    {
      root,
      route: leaf.route,
      title: leaf.name,
      description: leaf.description,
      image: leaf.image ?? FALLBACK,
      type: leaf.type ?? "website",
      meta: leaf.meta ?? [],
      sheets: site_.styles,
      scripts: [site_.asset("main.js")],
      data: leaf.data,
      noindex: leaf.noindex ?? false,
      catalog: catalogRows,
      fly: leaf.fly ?? false,
    },
    body as never,
  );
  return `<!doctype html>\n${renderToStaticMarkup(node)}\n`;
}

/* DATA */

const buyUrl = (id: string) => (SHOP ? `https://${SHOP}/cart/${id}:1` : "/cart/");

const shopRoute = (row: { category: string; handle: string }) => `/shop/${row.category}/${row.handle}/`;

function tasks(site_: Site) {
  const found = new Map<string, string[]>();
  for (const file of site_.input("tasks").files) {
    try {
      const task = JSON.parse(read(file));
      if (task.key) found.set(task.key, (task.printfiles ?? []).map((p: { name: string }) => p.name).filter(Boolean));
    } catch {
      console.warn(`site: ${file} is not a task, skipped`);
    }
  }
  return found;
}

function rows(site_: Site, catalog: Catalog[]): Row[] {
  const source = site_.input("shop");
  if (!source.files.length) throw new Error(`site: ${site_.input("shop").path} is missing; run bun run ${DEV ? "fake" : "snapshot"}`);
  const snapshot = JSON.parse(read(source.files[0])) as { at: number; products: ProductRow[] };
  const byType = new Map(catalog.map((entry) => [String(entry.id), entry]));
  const files = tasks(site_);
  const out: Row[] = [];
  for (const product of snapshot.products ?? []) {
    const entry = byType.get(String(product.type));
    if (!entry) {
      console.warn(`site: product type ${product.type} is not in catalog.json, ${product.key} skipped`);
      continue;
    }
    const variant = product.variants[0];
    if (!variant) {
      console.warn(`site: ${product.key} has no variant, skipped`);
      continue;
    }
    out.push({
      ...product,
      files: files.get(product.key) ?? product.files ?? [],
      title: entry.title,
      category: entry.category,
      handle: entry.handle,
      link: entry.link,
      price: variant.price,
      variant: variant.id,
    });
  }
  out.sort((a, b) => (a.created < b.created ? 1 : a.created > b.created ? -1 : a.key < b.key ? 1 : -1));
  return out;
}

const newestFirst = (list: Row[]) => {
  const seen = new Set<string>();
  const first: Row[] = [];
  const rest: Row[] = [];
  for (const row of list) {
    if (seen.has(row.type)) rest.push(row);
    else {
      seen.add(row.type);
      first.push(row);
    }
  }
  return [...first, ...rest];
};

function feed(site_: Site): Post[] {
  const source = site_.input("feed");
  if (!source.files.length) return [];
  try {
    return posts(read(source.files[0]));
  } catch {
    return [];
  }
}

/* COLLECT */

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

function collect(site_: Site) {
  const catalogFile = site_.input("catalog").files[0];
  const catalog = JSON.parse(read(catalogFile)) as Catalog[];
  catalogRows = catalog;
  const all = rows(site_, catalog);
  const index = site_.input("feed").files[0] ?? site_.input("feed").path;
  const shown = feed(site_);
  const byType = new Map<string, Row[]>();
  for (const row of all) byType.set(row.type, [...(byType.get(row.type) ?? []), row]);
  const inCategory = (slug: string) => all.filter((row) => row.category === slug);
  const ofProduct = (entry: Catalog) => byType.get(String(entry.id)) ?? [];
  const categoryCards: Card[] = [
    { name: "All", href: "/shop/", count: all.length },
    ...CATEGORIES.map(([slug, name]) => ({ name, href: `/shop/${slug}/`, count: inCategory(slug).length })),
  ];
  const productCards = (slug?: string): Card[] =>
    catalog
      .filter((entry) => (!slug || entry.category === slug) && ofProduct(entry).length)
      .map((entry) => ({ name: entry.title, href: shopRoute(entry), count: ofProduct(entry).length }));
  const routes: Route[] = [];
  routes.push({ route: "/", kind: "home", name: site.name, data: { products: newestFirst(all), posts: shown }, inputs: [catalogFile, index], at: today() });
  routes.push({
    route: "/shop/",
    kind: "shop",
    name: "All Variations",
    data: {
      trail: [{ name: "Shop" }],
      title: "All Variations",
      lead: `${plural(all.length, "variation")} across ${plural(productCards().length, "product")}, each for one moon.`,
      chips: [
        { label: "Categories", cards: categoryCards },
        { label: "Products", cards: productCards() },
      ],
      current: "/shop/",
      products: newestFirst(all),
    },
    inputs: [catalogFile],
    at: today(),
  });
  for (const [slug, name] of CATEGORIES) {
    const list = inCategory(slug);
    routes.push({
      route: `/shop/${slug}/`,
      kind: "shop",
      name,
      data: {
        trail: [{ name: "Shop", href: "/shop/" }, { name }],
        title: name,
        lead: `${plural(list.length, "variation")}.`,
        chips: [
          { label: "Categories", cards: categoryCards },
          { label: "Products", cards: productCards(slug) },
        ],
        current: `/shop/${slug}/`,
        products: newestFirst(list),
      },
      inputs: [catalogFile],
      at: today(),
    });
  }
  const names = new Map(CATEGORIES);
  for (const entry of catalog) {
    const list = ofProduct(entry);
    routes.push({
      route: shopRoute(entry),
      kind: "shop",
      name: entry.title,
      hidden: !list.length,
      data: {
        trail: [{ name: "Shop", href: "/shop/" }, { name: names.get(entry.category) ?? entry.category, href: `/shop/${entry.category}/` }, { name: entry.title }],
        title: entry.title,
        lead: `${plural(list.length, "variation")}.`,
        chips: [{ label: "Products", cards: productCards(entry.category) }],
        current: shopRoute(entry),
        products: list,
        noindex: !list.length,
      },
      inputs: [catalogFile],
      at: today(),
    });
  }
  for (const row of all) {
    routes.push({
      route: `/products/${row.key}/`,
      kind: "product",
      name: row.title,
      hidden: true,
      data: { product: row, family: byType.get(row.type) ?? [row] },
      inputs: [catalogFile],
      at: row.created.slice(0, 10),
    });
  }
  routes.push({ route: "/cart/", kind: "cart", name: "Bag", at: today(), hidden: true });
  const taken = new Set<string>();
  const readme = site_.input("readme").files[0];
  if (readme) {
    taken.add("about");
    routes.push({ route: "/about/", kind: "page", name: sheet(read(readme)).title || "About", source: readme, inputs: [readme], at: today() });
  }
  for (const file of site_.input("pages").files) {
    const name = basename(file, ".md");
    if (taken.has(name)) throw new Error(`site: two pages want /${name}/`);
    taken.add(name);
    routes.push({ route: `/${name}/`, kind: "page", name: sheet(read(file)).title || name, source: file, inputs: [file], at: today() });
  }
  shown.forEach((post, i) => {
    routes.push({
      route: postRoute(post.name),
      kind: "post",
      name: post.name,
      hidden: true,
      data: { post, prev: shown[i - 1] ?? null, next: shown[i + 1] ?? null },
      inputs: [index],
      at: (post.at || "").slice(0, 10) || today(),
    });
  });
  routes.push({ route: FEED_ROUTE, kind: "feed", name: "Feed", data: { posts: shown }, inputs: [index], at: today() });
  routes.push({ route: "/404.html", kind: "missing", name: "Not found", hidden: true });
  return routes;
}

/* RENDER */

const ogFor = (row: Row) => root + ogUrl(row.key);

const describe = (row: Row) => `${row.title} by ${site.name}. USD ${Number(row.price).toFixed(2)}. One design, one moon of ${Math.round(LIVE_DAYS)} days.`;

function cover(products: Row[]) {
  const first = products[0];
  if (!first) return FALLBACK;
  return first.images[0] ? grid(first.images[0].url, 1200) : ogFor(first);
}

function draw(site_: Site, route: Route): Output[] {
  const at = route.route === "/404.html" ? "404.html" : page(route.route);
  if (route.kind === "home") {
    const { products, posts: shown } = route.data as { products: Row[]; posts: Post[] };
    const body = h(Home, { posts: shown });
    return [{ path: at, bytes: shell(site_, { route: route.route, name: site.name, description: site.tagline, image: cover(products), fly: true }, body) }];
  }
  if (route.kind === "shop") {
    const data = route.data as { trail: Crumb[]; title: string; lead: string; chips: { label: string; cards: Card[] }[]; current: string; products: Row[]; noindex?: boolean };
    const body = h(Shop, { ...data, now });
    const leaf = { route: route.route, name: data.title, description: `${data.title}: ${data.lead}`, image: cover(data.products), noindex: data.noindex };
    return [{ path: at, bytes: shell(site_, leaf, body) }];
  }
  if (route.kind === "feed") {
    const { posts: shown } = route.data as { posts: Post[] };
    return [{ path: at, bytes: shell(site_, { route: route.route, name: "Feed", description: `The feed: ${plural(shown.length, "post")}, newest first.` }, h(Feed, { posts: shown })) }];
  }
  if (route.kind === "product") return product(site_, route, at);
  if (route.kind === "post") return post(site_, route, at);
  if (route.kind === "cart") {
    return [{ path: at, bytes: shell(site_, { route: route.route, name: "Bag", description: "Your bag.", noindex: true }, h(Cart, {})) }];
  }
  if (route.kind === "page") {
    const source = route.source as string;
    const doc = sheet(read(source), (url) => resolveLink(site_, source, url));
    return [{ path: at, bytes: shell(site_, { route: route.route, name: doc.title || route.name!, description: doc.text }, h(Doc, doc)) }];
  }
  return [{ path: "404.html", bytes: shell(site_, { route: route.route, name: "Not found", description: "That page is gone, or its moon has passed.", noindex: true }, h(NotFound, {})) }];
}

function post(site_: Site, route: Route, at: string): Output[] {
  const { post: one, prev, next } = route.data as { post: Post; prev: Post | null; next: Post | null };
  const full = root + postMaster(one.name);
  const leaf = {
    route: route.route,
    name: one.name,
    description: one.story || `Post ${one.name}, seed ${one.seed}, ${one.duration}s.`,
    image: root + postPoster(one.name),
    type: "video.other",
    meta: [
      { property: "og:video", content: full },
      { property: "og:video:type", content: "video/mp4" },
    ],
    noindex: true,
  };
  return [{ path: at, bytes: shell(site_, leaf, h(PostPage, { post: one, prev, next })) }];
}

function product(site_: Site, route: Route, at: string): Output[] {
  const { product: row, family } = route.data as { product: Row; family: Row[] };
  const sizes = row.variants.map((variant) => ({ id: variant.id, size: variant.size, price: variant.price }));
  const siblings: Record<string, unknown> = {};
  for (const one of family) {
    siblings[one.key] = { created: one.created, price: one.price, variants: one.variants, images: one.images, files: one.files, available: one.available, buy: buyUrl(one.variants[0]?.id ?? "") };
  }
  const names = new Map(CATEGORIES);
  const trail: Crumb[] = [
    { name: "Shop", href: "/shop/" },
    { name: names.get(row.category) ?? row.category, href: `/shop/${row.category}/` },
    { name: row.title, href: shopRoute(row) },
    { name: row.key },
  ];
  const body = [
    h(Product, { key: "product", trail, product: row, family, sizes, buy: buyUrl(row.variant), printful: PRINTFUL + row.link, shop: shopRoute(row), tiles: TILES, now }),
    h("script", { key: "siblings", type: "application/json", id: "siblings", dangerouslySetInnerHTML: { __html: JSON.stringify(siblings) } }),
  ];
  const data = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: row.title,
    sku: row.key,
    image: ogFor(row),
    description: describe(row),
    brand: { "@type": "Brand", name: site.name },
    offers: {
      "@type": "Offer",
      url: root + route.route,
      priceCurrency: "USD",
      price: Number(row.price).toFixed(2),
      availability: row.available ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
    },
  };
  return [{ path: at, bytes: shell(site_, { route: route.route, name: row.title, description: describe(row), image: ogFor(row), data, noindex: true }, body) }];
}

/* SPEC */

const devInputs = (inputs: Config["inputs"]) => {
  const out = { ...inputs };
  for (const name of ["shop", "feed", "tasks"]) out[name] = { ...out[name], path: out[name].path.replace("/site/", `/site/${DEV_DIR}/`) };
  return out;
};

const config: Config = {
  ...site,
  inputs: DEV ? devInputs(site.inputs) : site.inputs,
  assets: [
    { path: "ui", out: "ui", hash: true, ext: ".css" },
    { path: ".cache/client", out: "js", hash: true, ext: ".js" },
  ],
};

export const spec: Spec = {
  root: org,
  out: dist,
  config,
  templates: ["src", "scripts", "ui"],
  prepare: bundle,
  collect,
  render: draw,
};

export async function pages() {
  return await build(spec, { manifest: ".cache/manifest.json" });
}

if (import.meta.main) {
  const done = await pages();
  const played = done.site.routes.filter((one) => one.kind === "post").length;
  console.log(`site${DEV ? " DEV" : ""}: ${done.site.routes.length} routes, ${played} posts, ${done.rendered} rendered, ${done.written} files written, ${done.removed} dropped`);
}
