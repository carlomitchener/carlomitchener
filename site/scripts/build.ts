import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { createElement as h } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { Output, Route, Site, Spec } from "mrlyjs/ssg/build.ts";
import { loadEnv } from "../lib/env.ts";
import { tree } from "../lib/tree.js";
import { grid, ogUrl } from "../lib/shop.ts";
import { kit } from "./kit.ts";
import site from "../site.json";

loadEnv();
await kit();

const { build, escape } = await import("mrlyjs/ssg/build.ts");
const R = await import("../lib/render.jsx");

const org = resolve(import.meta.dir, "..");
const dist = join(org, "dist");
const root = (process.env.SITE_URL ?? site.root).replace(/\/$/, "");
const SHOP = process.env.SHOPIFY_SHOP_URL ?? "";
const DAY = 24 * 60 * 60 * 1000;

const read = (path: string) => readFileSync(path, "utf8");
const lower = (text: string) => String(text ?? "").toLowerCase();

/* MARKDOWN */

const inline = (text: string) =>
  escape(text)
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>")
    .replace(/`([^`]+)`/g, "<code>$1</code>");

function markdown(text: string) {
  const out: string[] = [];
  for (const block of text.trim().split(/\n{2,}/)) {
    const line = block.trim();
    if (!line) continue;
    const head = line.match(/^(#{1,3})\s+(.*)$/);
    if (head) out.push(`<h${head[1].length}>${inline(head[2])}</h${head[1].length}>`);
    else if (line.startsWith("- ")) out.push(`<ul>${line.split("\n").map((item) => `<li>${inline(item.replace(/^- /, ""))}</li>`).join("")}</ul>`);
    else out.push(`<p>${inline(line.replace(/\n/g, " "))}</p>`);
  }
  return out.join("\n");
}

/* TYPES */

type Row = {
  key: string;
  type: string;
  created: string;
  available: boolean;
  variants: { id: string; size: string; price: string; available: boolean }[];
  images: { url: string; alt: string; style: string }[];
  files: string[];
  title: string;
  category: string;
  link: string;
  price: string;
  variant: string;
};

/* HEAD */

function head(site_: Site, leaf: { route: string; name: string; description: string; image: string; type: string; data?: object; scripts: string[] }) {
  const url = root + leaf.route;
  const tags = [
    `<link rel="canonical" href="${url}">`,
    `<meta name="description" content="${escape(leaf.description)}">`,
    `<meta property="og:title" content="${escape(leaf.name)}">`,
    `<meta property="og:description" content="${escape(leaf.description)}">`,
    `<meta property="og:url" content="${url}">`,
    `<meta property="og:type" content="${leaf.type}">`,
    `<meta property="og:site_name" content="${escape(site.title)}">`,
    `<meta property="og:image" content="${leaf.image}">`,
    `<meta property="og:image:width" content="1200">`,
    `<meta property="og:image:height" content="1200">`,
    `<meta name="twitter:card" content="summary_large_image">`,
    `<meta name="twitter:image" content="${leaf.image}">`,
    `<link rel="icon" href="/favicon.png" type="image/png">`,
    `<link rel="apple-touch-icon" href="/apple-touch-icon.png">`,
    `<link rel="manifest" href="/manifest.webmanifest">`,
  ];
  const css = ["tokens.css", "base.css", "chrome.css", "brand.css"].map((name) => `<link rel="stylesheet" href="${site_.asset(name)}">`);
  const js = ["chrome.js", ...leaf.scripts].map((name) => `<script type="module" src="${site_.asset(name)}"></script>`);
  const ld = leaf.data ? `<script type="application/ld+json">${JSON.stringify(leaf.data)}</script>` : "";
  return [...tags, ...css, ld, ...js].filter(Boolean).join("\n");
}

function shell(site_: Site, leaf: { route: string; name: string; description: string; image: string; type: string; data?: object; scripts: string[]; body: unknown }) {
  const main = renderToStaticMarkup(leaf.body as never);
  return `<!doctype html>
<html lang="en" data-prefix="${site.prefix}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escape(leaf.name === site.title ? site.title : `${leaf.name} · ${site.title}`)}</title>
${head(site_, leaf)}
</head>
<body>
${main}
</body>
</html>
`;
}

/* DATA */

const CATEGORIES = ["accessories", "bags", "kids", "men", "unisex", "women"];

const cycle = (name: string) => {
  const order = ["all", ...CATEGORIES];
  const at = order.indexOf(name);
  return `/collections/${order[(at + 1) % order.length]}/`;
};

const buyUrl = (id: string) => (SHOP ? `https://${SHOP}/cart/${id}:1` : "/cart/");

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

function rows(site_: Site): Row[] {
  const source = site_.input("shop");
  if (!source.files.length) throw new Error("site: data/shop.json is missing; run bun run snapshot or bun run fake");
  const snapshot = JSON.parse(read(source.files[0])) as { at: number; products: Row[] };
  const catalog = JSON.parse(read(site_.input("catalog").files[0])) as { id: number; category: string; title: string; link: string }[];
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

/* COLLECT */

const LEAD = "one design at a time. every printfile and every tile is a free download.";

function collect(site_: Site) {
  const all = rows(site_);
  const catalog = site_.input("catalog").files[0];
  const byType = new Map<string, Row[]>();
  for (const row of all) byType.set(row.type, [...(byType.get(row.type) ?? []), row]);
  const nav = tree({
    collections: [
      { name: "all", href: "/collections/all/" },
      ...CATEGORIES.map((name) => ({ name, href: `/collections/${name}/` })),
    ],
  });
  const routes: Route[] = [];
  routes.push({ route: "/", kind: "home", name: site.title, data: { products: all }, inputs: [catalog], at: today() });
  routes.push({ route: "/collections/", kind: "collections", name: "collections", data: { products: all }, inputs: [catalog], at: today() });
  for (const name of ["all", ...CATEGORIES]) {
    const list = name === "all" ? all : all.filter((row) => row.category === name);
    routes.push({
      route: `/collections/${name}/`,
      kind: "collection",
      name,
      data: { name, products: newestFirst(list) },
      inputs: [catalog],
      at: today(),
    });
  }
  for (const row of all) {
    const family = byType.get(row.type) ?? [row];
    routes.push({
      route: `/products/${row.key}/`,
      kind: "product",
      name: lower(row.title),
      data: { product: row, family },
      inputs: [catalog],
      at: row.created.slice(0, 10),
    });
  }
  routes.push({ route: "/cart/", kind: "cart", name: "cart", inputs: [catalog], at: today(), hidden: true });
  const about = site_.input("pages").files.find((file) => file.endsWith("about.md"));
  if (about) routes.push({ route: "/about/", kind: "about", name: "about", source: about, inputs: [about], at: today() });
  routes.push({ route: "/404.html", kind: "missing", name: "not found", hidden: true });
  return { routes, nav };
}

const today = () => new Date().toISOString().slice(0, 10);

/* RENDER */

const ogFor = (row: Row) => root + ogUrl(row.key);

function describe(row: Row) {
  return `${lower(row.title)} by ${site.title}. USD ${Number(row.price).toFixed(2)}. One design, ${site.live} days.`;
}

function draw(site_: Site, route: Route): Output[] {
  const path = route.route === "/404.html" ? "404.html" : `${route.route.replace(/^\/|\/$/g, "")}/index.html`.replace(/^\//, "");
  const at = route.route === "/" ? "index.html" : path;
  if (route.kind === "home") {
    const { products } = route.data as { products: Row[] };
    const body = h(R.Page, { route: route.route, nav: site_.nav, controls: h(R.Filter, { label: "all", count: products.length, next: cycle("all") }) }, h(R.Home, { products, lead: LEAD }));
    return [{ path: at, bytes: shell(site_, { route: route.route, name: site.title, description: LEAD, image: cover(products), type: "website", scripts: ["cart.js"], body }) }];
  }
  if (route.kind === "collections") {
    const { products } = route.data as { products: Row[] };
    const cards = ["all", ...CATEGORIES].map((name) => {
      const list = name === "all" ? products : products.filter((row) => row.category === name);
      return { name, href: `/collections/${name}/`, emoji: (site.emoji as Record<string, string>)[name] ?? "", count: list.length, image: list[0]?.images[0], key: list[0]?.key };
    });
    const body = h(R.Page, { route: route.route, nav: site_.nav, controls: h(R.Filter, { label: "all", count: products.length, next: cycle("all") }) }, h(R.Collections, { cards }));
    return [{ path: at, bytes: shell(site_, { route: route.route, name: "collections", description: "every design, by what it is printed on.", image: cover(products), type: "website", scripts: ["cart.js"], body }) }];
  }
  if (route.kind === "collection") {
    const { name, products } = route.data as { name: string; products: Row[] };
    const body = h(R.Page, { route: route.route, nav: site_.nav, controls: h(R.Filter, { label: name, count: products.length, next: cycle(name) }) }, h(R.Collection, { name, products }));
    const lead = `${products.length} design${products.length === 1 ? "" : "s"} in ${name}.`;
    return [{ path: at, bytes: shell(site_, { route: route.route, name, description: lead, image: cover(products), type: "website", scripts: ["cart.js"], body }) }];
  }
  if (route.kind === "product") return product(site_, route, at);
  if (route.kind === "cart") {
    const body = h(R.Page, { route: route.route, nav: site_.nav }, h(R.Cart, {}));
    return [{ path: at, bytes: shell(site_, { route: route.route, name: "cart", description: "your cart.", image: `${root}/mark.png`, type: "website", scripts: ["cart.js"], body }) }];
  }
  if (route.kind === "about") {
    const text = markdown(read(route.source as string));
    const body = h(R.Page, { route: route.route, nav: site_.nav }, h(R.About, { body: text }));
    return [{ path: at, bytes: shell(site_, { route: route.route, name: "about", description: "who makes this shop and why every file is free.", image: `${root}/mark.png`, type: "website", scripts: ["cart.js"], body }) }];
  }
  const body = h(R.Page, { route: route.route, nav: site_.nav }, h(R.NotFound, {}));
  return [{ path: "404.html", bytes: shell(site_, { route: route.route, name: "not found", description: "that page is gone, or the design expired.", image: `${root}/mark.png`, type: "website", scripts: ["cart.js"], body }) }];
}

function cover(products: Row[]) {
  const first = products[0];
  if (!first) return `${root}/mark.png`;
  return first.images[0] ? grid(first.images[0].url, 1200) : ogFor(first);
}

function product(site_: Site, route: Route, at: string): Output[] {
  const { product: row, family } = route.data as { product: Row; family: Row[] };
  const sizes = row.variants.map((variant) => ({ id: variant.id, size: variant.size, price: variant.price }));
  const index = family.findIndex((one) => one.key === row.key);
  const expires = new Date(row.created).getTime() + site.live * DAY;
  const printful = site.printful + row.link;
  const siblings: Record<string, unknown> = {};
  for (const one of family) {
    siblings[one.key] = {
      created: one.created,
      price: one.price,
      variants: one.variants,
      images: one.images,
      files: one.files,
      available: one.available,
      buy: buyUrl(one.variants[0]?.id ?? ""),
    };
  }
  const controls = h(R.Controls, { product: row, printful, sizes, index: index < 0 ? 0 : index, total: family.length, buy: buyUrl(row.variant), expires, live: site.live * DAY });
  const body = h(
    R.Page,
    { route: route.route, nav: site_.nav, controls },
    h(R.Product, { product: row, siblings: family, printful, files: row.files, tiles: site.tiles }),
    h("script", { type: "application/json", id: "siblings", dangerouslySetInnerHTML: { __html: JSON.stringify(siblings) } }),
  );
  const data = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: lower(row.title),
    sku: row.key,
    image: ogFor(row),
    description: describe(row),
    brand: { "@type": "Brand", name: site.title },
    offers: {
      "@type": "Offer",
      url: root + route.route,
      priceCurrency: "USD",
      price: Number(row.price).toFixed(2),
      availability: row.available ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
    },
  };
  return [
    {
      path: at,
      bytes: shell(site_, {
        route: route.route,
        name: lower(row.title),
        description: describe(row),
        image: ogFor(row),
        type: "website",
        data,
        scripts: ["cart.js", "expiry.js", "flip.js"],
        body,
      }),
    },
  ];
}

/* SPEC */

const spec: Spec = {
  root: org,
  out: dist,
  templates: ["lib", "scripts", "js", "ui"],
  collect,
  render: draw,
  asset: (name, body) => (name === "cart.js" ? new TextDecoder().decode(body).replaceAll("{{SHOP}}", SHOP) : body),
};

export async function pages() {
  return await build(spec, { manifest: ".cache/manifest.json" });
}

if (import.meta.main) {
  const done = await pages();
  console.log(`site: ${done.site.routes.length} routes, ${done.rendered} rendered, ${done.written} files written, ${done.removed} dropped`);
}
