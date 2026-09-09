import { readFileSync } from "node:fs";
import { basename, join, resolve } from "node:path";
import { createElement as h } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { Output, Route, Site, Spec } from "kit/ssg/build.ts";
import type { Leaf as GitLeaf } from "kit/git/git.ts";
import { loadEnv } from "../lib/env.ts";
import { tree } from "../lib/tree.js";
import { grid, ogUrl } from "../lib/shop.ts";
import { kit } from "./kit.ts";
import site from "../site.json";

loadEnv();
await kit();

const { build, escape } = await import("kit/ssg/build.ts");
const { isGit } = await import("kit/git/git.ts");
const { resolve: resolveLink } = await import("kit/ssg/links.ts");
const { headScript, tintCss } = await import("kit/ui/config.js");
const R = await import("../lib/render.jsx");

const org = resolve(import.meta.dir, "..");
const dist = join(org, "dist");
const root = (process.env.SITE_URL ?? site.root).replace(/\/$/, "");
const SHOP = process.env.SHOPIFY_SHOP_URL ?? "";
const DAY = 24 * 60 * 60 * 1000;
const FALLBACK = `${root}/icon-512.png`;

const read = (path: string) => readFileSync(path, "utf8");

const slugify = (text: string) => String(text ?? "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

/* MARKDOWN */

const marks = (html: string) =>
  html
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>")
    .replace(/`([^`]+)`/g, "<code>$1</code>");

const inline = (text: string, href?: (url: string) => string) => {
  let out = "";
  let at = 0;
  for (const hit of text.matchAll(/\[([^\]]+)\]\(([^)]+)\)/g)) {
    out += escape(text.slice(at, hit.index)) + `<a href="${escape(href ? href(hit[2]) : hit[2])}">${escape(hit[1])}</a>`;
    at = hit.index! + hit[0].length;
  }
  return marks(out + escape(text.slice(at)));
};

function markdown(text: string, href?: (url: string) => string) {
  const out: string[] = [];
  for (const block of text.trim().split(/\n{2,}/)) {
    const line = block.trim();
    if (!line) continue;
    const head = line.match(/^(#{1,3})\s+(.*)$/);
    if (head) out.push(`<h${head[1].length}>${inline(head[2], href)}</h${head[1].length}>`);
    else if (line.startsWith("- ")) out.push(`<ul>${line.split("\n").map((item) => `<li>${inline(item.replace(/^- /, ""), href)}</li>`).join("")}</ul>`);
    else out.push(`<p>${inline(line.replace(/\n/g, " "), href)}</p>`);
  }
  return out.join("\n");
}

function sheet(text: string, href?: (url: string) => string) {
  const blocks = text.trim().split(/\n{2,}/).map((block) => block.trim()).filter(Boolean);
  let title = "";
  let lead = "";
  const rest: string[] = [];
  for (const block of blocks) {
    const head = !title && block.match(/^#\s+(.*)$/);
    if (head) {
      title = head[1].trim();
      continue;
    }
    if (title && !lead && !block.startsWith("#") && !block.startsWith("- ")) {
      lead = block.replace(/\n/g, " ");
      continue;
    }
    rest.push(block);
  }
  return { title, lead, body: markdown(rest.join("\n\n"), href) };
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

type Leaf = { route: string; name: string; description: string; image: string; type: string; data?: object; scripts: string[]; code?: boolean };

/* HEAD */

function head(site_: Site, leaf: Leaf) {
  const url = root + leaf.route;
  const tags = [
    `<link rel="canonical" href="${url}">`,
    `<meta name="description" content="${escape(leaf.description)}">`,
    `<meta property="og:title" content="${escape(leaf.name)}">`,
    `<meta property="og:description" content="${escape(leaf.description)}">`,
    `<meta property="og:url" content="${url}">`,
    `<meta property="og:type" content="${leaf.type}">`,
    `<meta property="og:site_name" content="${escape(site.name)}">`,
    `<meta property="og:image" content="${leaf.image}">`,
    `<meta property="og:image:width" content="1200">`,
    `<meta property="og:image:height" content="1200">`,
    `<meta name="twitter:card" content="summary_large_image">`,
    `<meta name="twitter:image" content="${leaf.image}">`,
    `<link rel="icon" href="/favicon.svg" type="image/svg+xml">`,
    `<link rel="icon" href="/favicon.png" type="image/png" sizes="40x40">`,
    `<link rel="apple-touch-icon" href="/apple-touch-icon.png">`,
    `<link rel="manifest" href="/manifest.webmanifest">`,
  ];
  const sheets = ["palette.css", "tokens.css", "base.css", "chrome.css", "fonts/fonts.css", "brand.css", ...(leaf.code ? ["code.css", "seti/seti.css"] : [])];
  const css = sheets.map((name) => `<link rel="stylesheet" href="${site_.asset(name)}">`);
  const tint = `<style>${tintCss(site.tint)}</style>`;
  const js = ["chrome.js", ...leaf.scripts].map((name) => `<script type="module" src="${site_.asset(name)}"></script>`);
  const ld = leaf.data ? `<script type="application/ld+json">${JSON.stringify(leaf.data)}</script>` : "";
  return [...tags, ...css, tint, ld, ...js].filter(Boolean).join("\n");
}

function shell(site_: Site, leaf: Leaf & { body: unknown }) {
  const main = renderToStaticMarkup(leaf.body as never);
  return `<!doctype html>
<html lang="en" data-prefix="${site.prefix}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
${headScript(site.prefix)}
<title>${escape(leaf.name === site.name ? site.name : `${leaf.name} · ${site.name}`)}</title>
${head(site_, leaf)}
</head>
<body>
${main}
</body>
</html>
`;
}

/* DATA */

const CATEGORIES: [string, string][] = [
  ["accessories", "Accessories"],
  ["bags", "Bags"],
  ["kids", "Kids"],
  ["men", "Men"],
  ["unisex", "Unisex"],
  ["women", "Women"],
];

const TABS = ["all", ...CATEGORIES.map(([slug]) => slug)];

const cycle = (slug: string) => {
  const at = TABS.indexOf(slug);
  return `/collections/${TABS[(at + 1) % TABS.length]}/`;
};

const emoji = (name: string) => (site.emoji as Record<string, string>)[name] ?? "";

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

const LEAD = "One design at a time. Every printfile and every tile is a free download.";
const INDEX = "Every design, by category and by product.";

const HERO: Record<string, string> = { contact: "site-contact", donate: "site-donate" };

const ACTION: Record<string, { href: string; name: string }> = {
  donate: { href: "https://donate.stripe.com/dRm3cu3XLfHj19e6WW5kk00", name: "Donate" },
};

const PAGES: [string, string, string][] = [
  ["Cart", "/cart/", "site-cart"],
  ["About", "/about/", "site-icon"],
  ["Contact", "/contact/", "site-contact"],
  ["FAQ", "/faq/", "site-page"],
  ["Terms", "/terms/", "site-page"],
  ["Privacy", "/privacy/", "site-page"],
  ["Donate", "/donate/", "site-donate"],
];

const figure = (stem: string) => ({ dark: `/figures/${stem}-dark.png`, light: `/figures/${stem}-light.png` });

function collect(site_: Site) {
  const all = rows(site_);
  const catalog = site_.input("catalog").files[0];
  const byType = new Map<string, Row[]>();
  for (const row of all) byType.set(row.type, [...(byType.get(row.type) ?? []), row]);
  const kinds = [...byType.entries()]
    .map(([type, list]) => ({ type, slug: slugify(list[0].title), name: list[0].title, list }))
    .sort((a, b) => a.name.localeCompare(b.name));
  const nav = tree({
    collections: [
      { name: "All", href: "/collections/all/" },
      ...CATEGORIES.map(([slug, name]) => ({ name, href: `/collections/${slug}/` })),
      ...kinds.map((kind) => ({ name: kind.name, href: `/collections/${kind.slug}/` })),
    ],
  });
  const card = (name: string, href: string, mark: string, list: Row[]) => ({
    name,
    href,
    emoji: mark,
    count: list.length,
    image: list[0]?.images[0] ?? null,
    key: list[0]?.key ?? "",
  });
  const groups = [
    {
      name: "By category",
      cards: [
        card("All", "/collections/all/", emoji("all"), all),
        ...CATEGORIES.map(([slug, name]) => card(name, `/collections/${slug}/`, emoji(slug), all.filter((row) => row.category === slug))),
      ],
    },
    { name: "By product", cards: kinds.map((kind) => card(kind.name, `/collections/${kind.slug}/`, emoji(kind.list[0].category), kind.list)) },
  ];
  const shelf = (name: string, href: string, list: Row[]) => {
    const image = list[0]?.images[0];
    const url = image ? grid(image.url, 600) : "";
    return {
      name,
      href,
      ...(url ? { figure: { dark: url, light: url } } : {}),
      text: `${list.length} design${list.length === 1 ? "" : "s"}`,
    };
  };
  const menu = [
    {
      name: "Collections",
      href: "/collections/",
      nodes: [
        shelf("All", "/collections/all/", all),
        ...CATEGORIES.map(([slug, name]) => shelf(name, `/collections/${slug}/`, all.filter((row) => row.category === slug))),
        ...kinds.map((kind) => shelf(kind.name, `/collections/${kind.slug}/`, kind.list)),
      ],
    },
    {
      name: "Pages",
      nodes: PAGES.map(([name, href, stem]) => ({ name, href, figure: figure(stem) })),
    },
  ];
  const routes: Route[] = [];
  routes.push({ route: "/", kind: "home", name: site.name, data: { products: all }, inputs: [catalog], at: today() });
  routes.push({ route: "/collections/", kind: "collections", name: "Collections", data: { groups, count: all.length, image: cover(all) }, inputs: [catalog], at: today() });
  for (const [slug, name] of [["all", "All"] as [string, string], ...CATEGORIES]) {
    const list = slug === "all" ? all : all.filter((row) => row.category === slug);
    routes.push({
      route: `/collections/${slug}/`,
      kind: "collection",
      name,
      data: { slug, name, products: newestFirst(list) },
      inputs: [catalog],
      at: today(),
    });
  }
  for (const kind of kinds) {
    routes.push({
      route: `/collections/${kind.slug}/`,
      kind: "collection",
      name: kind.name,
      data: { slug: kind.slug, name: kind.name, products: kind.list },
      inputs: [catalog],
      at: today(),
    });
  }
  for (const row of all) {
    const family = byType.get(row.type) ?? [row];
    routes.push({
      route: `/products/${row.key}/`,
      kind: "product",
      name: row.title,
      data: { product: row, family, slug: slugify(row.title) },
      inputs: [catalog],
      at: row.created.slice(0, 10),
    });
  }
  routes.push({ route: "/cart/", kind: "cart", name: "Cart", inputs: [catalog], at: today(), hidden: true });
  routes.push({ route: "/menu/", kind: "menu", name: "Menu", data: { menu }, at: today() });
  for (const file of site_.input("pages").files) {
    const name = basename(file, ".md");
    routes.push({ route: `/${name}/`, kind: "page", name: sheet(read(file)).title || name, source: file, inputs: [file], at: today() });
  }
  routes.push({ route: "/404.html", kind: "missing", name: "Not found", hidden: true });
  return { routes, nav };
}

const today = () => new Date().toISOString().slice(0, 10);

/* RENDER */

const ogFor = (row: Row) => root + ogUrl(row.key);

const describe = (row: Row) => `${row.title} by ${site.name}. USD ${Number(row.price).toFixed(2)}. One design, ${site.live} days.`;

function cover(products: Row[]) {
  const first = products[0];
  if (!first) return FALLBACK;
  return first.images[0] ? grid(first.images[0].url, 1200) : ogFor(first);
}

function draw(site_: Site, route: Route): Output[] {
  const path = route.route === "/404.html" ? "404.html" : `${route.route.replace(/^\/|\/$/g, "")}/index.html`.replace(/^\//, "");
  const at = route.route === "/" ? "index.html" : path;
  if (route.kind === "home") {
    const { products } = route.data as { products: Row[] };
    const body = h(R.Page, { route: route.route, nav: site_.nav, controls: h(R.Filter, { label: "All", count: products.length, next: cycle("all") }) }, h(R.Home, { products, lead: LEAD }));
    return [{ path: at, bytes: shell(site_, { route: route.route, name: site.name, description: LEAD, image: cover(products), type: "website", scripts: ["cart.js"], body }) }];
  }
  if (route.kind === "collections") {
    const { groups, count, image } = route.data as { groups: unknown[]; count: number; image: string };
    const body = h(R.Page, { route: route.route, nav: site_.nav, controls: h(R.Filter, { label: "All", count, next: cycle("all") }) }, h(R.Collections, { groups, lead: INDEX }));
    return [{ path: at, bytes: shell(site_, { route: route.route, name: "Collections", description: INDEX, image, type: "website", scripts: ["cart.js"], body }) }];
  }
  if (route.kind === "collection") {
    const { slug, name, products } = route.data as { slug: string; name: string; products: Row[] };
    const body = h(R.Page, { route: route.route, nav: site_.nav, controls: h(R.Filter, { label: name, count: products.length, next: cycle(slug) }) }, h(R.Collection, { name, products }));
    const lead = `${products.length} design${products.length === 1 ? "" : "s"} in ${name}.`;
    return [{ path: at, bytes: shell(site_, { route: route.route, name, description: lead, image: cover(products), type: "website", scripts: ["cart.js"], body }) }];
  }
  if (route.kind === "product") return product(site_, route, at);
  if (route.kind === "cart") {
    const body = h(R.Page, { route: route.route, nav: site_.nav }, h(R.Cart, {}));
    return [{ path: at, bytes: shell(site_, { route: route.route, name: "Cart", description: "Your cart.", image: FALLBACK, type: "website", scripts: ["cart.js"], body }) }];
  }
  if (route.kind === "menu") {
    const { menu } = route.data as { menu: unknown[] };
    const body = h(R.Page, { route: route.route, nav: site_.nav }, h(R.Menu, { tree: menu }));
    return [{ path: at, bytes: shell(site_, { route: route.route, name: "Menu", description: `Every page on ${site.name}.`, image: FALLBACK, type: "website", scripts: ["cart.js"], body }) }];
  }
  if (route.kind === "page") {
    const name = basename(route.source as string, ".md");
    const doc = sheet(read(route.source as string), (url) => resolveLink(site_, route.source as string, url));
    const body = h(R.Page, { route: route.route, nav: site_.nav }, h(R.Doc, { ...doc, hero: HERO[name], action: ACTION[name] }));
    return [{ path: at, bytes: shell(site_, { route: route.route, name: doc.title || name, description: doc.lead, image: FALLBACK, type: "website", scripts: ["cart.js"], body }) }];
  }
  const body = h(R.Page, { route: route.route, nav: site_.nav }, h(R.NotFound, {}));
  return [{ path: "404.html", bytes: shell(site_, { route: route.route, name: "Not found", description: "That page is gone, or the design expired.", image: FALLBACK, type: "website", scripts: ["cart.js"], body }) }];
}

function product(site_: Site, route: Route, at: string): Output[] {
  const { product: row, family, slug } = route.data as { product: Row; family: Row[]; slug: string };
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
    h(R.Product, { product: row, siblings: family, collection: `/collections/${slug}/`, files: row.files, tiles: site.tiles }),
    h("script", { type: "application/json", id: "siblings", dangerouslySetInnerHTML: { __html: JSON.stringify(siblings) } }),
  );
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
  return [
    {
      path: at,
      bytes: shell(site_, {
        route: route.route,
        name: row.title,
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

/* GIT */

function gitPage(site_: Site, leaf: GitLeaf) {
  const article = h("article", { className: "prose", dangerouslySetInnerHTML: { __html: leaf.body } });
  const body = h(R.Page, { route: leaf.route, nav: leaf.tree ?? site_.nav, wide: leaf.wide }, article);
  return shell(site_, {
    route: leaf.route,
    name: leaf.name,
    description: leaf.description,
    image: FALLBACK,
    type: leaf.type ?? "website",
    code: leaf.code,
    scripts: ["cart.js"],
    body,
  });
}

/* SPEC */

export const spec: Spec = {
  root: org,
  out: dist,
  templates: ["lib", "scripts", "js", "ui"],
  collect,
  render: draw,
  git: { page: gitPage, md: (site_, text, from) => markdown(text, (url) => resolveLink(site_, from, url)) },
  asset: (name, body) => (name === "cart.js" ? new TextDecoder().decode(body).replaceAll("{{SHOP}}", SHOP) : body),
};

export async function pages() {
  return await build(spec, { manifest: ".cache/manifest.json" });
}

if (import.meta.main) {
  const done = await pages();
  const code = done.site.routes.filter(isGit).length;
  console.log(`site: ${done.site.routes.length} routes, ${code} code pages, ${done.rendered} rendered, ${done.written} files written, ${done.removed} dropped`);
}
