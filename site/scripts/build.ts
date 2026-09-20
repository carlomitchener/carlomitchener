import { readFileSync } from "node:fs";
import { basename, join, resolve } from "node:path";
import { createElement as h } from "react";
import { renderToStaticMarkup, renderToString } from "react-dom/server";
import { build, page, type Config, type Output, type Route, type Site, type Spec } from "../ssg/build.ts";
import { resolve as resolveLink } from "../ssg/links.ts";
import { ALIKE, CATEGORIES, DOCS, docUrl, FILES, GIFT, HOME_ROW, LIVE_DAYS, MATCH, PAGES, PRINTFUL, SHOP, SHOP_DOCS, TILES, type Catalog } from "../src/config/shop.ts";
import { DEV, DEV_DIR } from "../src/config/dev.ts";
import { INLINE } from "../src/config/boot.ts";
import { loadEnv } from "../src/lib/env.ts";
import { sheet } from "../ssg/md.ts";
import { FEED_ROUTE, postMaster, postPoster, postRoute, posts, type Post } from "../src/lib/feed.ts";
import { collectionUrl, designOf, facetsOf, GIFT_PREFIX, giftUrl, grid, handleOf, isDesign, PRIMARIES, primaryOf, productUrl, type Facets, type Primary, type ProductRow } from "../src/lib/shop.ts";
import { App } from "../src/App.jsx";
import { Page } from "../src/components/Page.jsx";
import { TIERS } from "../src/pages/GiftCard.jsx";
import site from "../site.json";

loadEnv();

const org = resolve(import.meta.dir, "..");
const dist = join(org, "dist");
const client = join(org, ".cache", "client");
const root = (process.env.SITE_URL ?? site.root).replace(/\/$/, "");
const STORE = DEV ? "" : (process.env.SHOPIFY_SHOP_URL ?? "");
const FALLBACK = `${root}/bird/bird-512.png`;

const read = (path: string) => readFileSync(path, "utf8");

const now = Number(process.env.SITE_NOW) || Date.now();

const today = () => new Date(now).toISOString().slice(0, 10);

const seeded = (seed: number) => () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const random = seeded(now);

/* TYPES */

type Row = ProductRow & { title: string; category: string; handle: string; link: string; price: string; variant: string };

type Pair = Row & Record<Primary, Row>;

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
  preconnect?: string;
};

/* CLIENT */

async function bundle() {
  const out = await Bun.build({
    entrypoints: [join(org, "src", "client", "main.tsx")],
    outdir: client,
    naming: "[name].[ext]",
    minify: true,
    define: { SHOP: JSON.stringify(STORE), "process.env.NODE_ENV": '"production"' },
  });
  if (!out.success) throw new Error(`site: client bundle failed\n${out.logs.map(String).join("\n")}`);
  await sky();
}

const SKY = ["bird", "avatar", "sky-core", "sky-mood", "sky-clouds", "sky-weather", "sky-bird", "sky"];

async function sky() {
  const avatar = resolve(org, "../avatar");
  const all = join(org, ".cache", "sky", "all.js");
  await Bun.write(all, SKY.map((name) => read(join(avatar, `${name}.js`))).join("\n"));
  const out = await Bun.build({ entrypoints: [all], outdir: client, naming: "sky.[ext]", minify: true });
  if (!out.success) throw new Error(`site: sky bundle failed\n${out.logs.map(String).join("\n")}`);
}

/* SHELL */

let chromeRows: { category: string; title: string; handle: string }[] = [];

const HOIST = /^(?:<link [^>]*\/>)+/;

const linked = (text: string) => (text.match(/<link [^>]*\/>/g) ?? []).filter((one) => one.includes(" href=")).join("");

function shell(site_: Site, at: string, leaf: Leaf, one: { kind: string; props: object }): Output[] {
  const view = {
    page: { kind: one.kind, title: leaf.name, props: one.props },
    chrome: { route: leaf.route, catalog: chromeRows, fly: leaf.fly ?? false, now },
  };
  const drawn = renderToString(h(App, view as never));
  const hoisted = HOIST.exec(drawn)?.[0] ?? "";
  const node = h(Page, {
    root,
    route: leaf.route,
    title: leaf.name,
    description: leaf.description,
    image: leaf.image ?? FALLBACK,
    type: leaf.type ?? "website",
    meta: leaf.meta ?? [],
    sheets: site_.styles,
    scripts: [site_.asset("main.js")],
    sky: site_.asset("sky.js"),
    data: leaf.data,
    noindex: leaf.noindex ?? false,
    preconnect: leaf.preconnect,
    app: drawn.slice(hoisted.length),
    props: view,
  });
  const html = renderToStaticMarkup(node).replace("</head>", `${linked(hoisted)}</head>`);
  const out: Output[] = [{ path: at, bytes: `<!doctype html>\n${html}\n` }];
  if (at.endsWith("index.html")) out.push({ path: at.replace(/index\.html$/, "props.json"), bytes: JSON.stringify(view) });
  return out;
}

/* TRIM */

const shot = (row: Row) => {
  const image = row.images[0];
  return image ? { url: image.url, alt: image.alt } : null;
};

const card = (row: Pair) => ({
  key: row.key,
  title: row.title,
  design: row.design,
  group: row.group ?? "",
  secondary: row.secondary ?? [],
  created: row.created,
  released: row.released,
  price: row.price,
  light: shot(row.light),
  dark: shot(row.dark),
});

const half = (row: Row) => ({ key: row.key, released: row.released, available: row.available, price: row.price, variants: row.variants, images: row.images, files: row.files });

const teaser = (one: Post) => ({ name: one.name, at: one.at, duration: one.duration, size: one.size });

const moon = (one: Design) => ({ design: one.design, count: one.count, released: one.released });

/* DATA */

const BUY = STORE ? `https://${STORE}/cart/` : "";

const STORE_ORIGIN = STORE ? `https://${STORE}` : undefined;

const shopRoute = (row: { handle: string }) => collectionUrl(row.handle);

const RESERVED = new Set(["about", "shop", "cart", "automator", "stats", "feed", "pages", "search.json", "404.html", "cdn", "ui", "js", "fonts", "bird", "art"]);

const SHOP_RESERVED = new Set(["designs", "gift-card", ...SHOP_DOCS, ...CATEGORIES.map(([slug]) => slug)]);

const VENDOR = "Printful";

let giftRows: ProductRow[] = [];

type Gift = (typeof TIERS)[number] & { product: ProductRow };

const tier = (one: Gift) => ({ tier: one.tier, name: one.name, tint: one.tint, from: one.from, to: one.to });

type Facet = { key: string; label: string; values: { name: string; n: number }[] };

const FACET_CAP = 12;

function facetsFor(list: Pair[]): Facet[] {
  const count = (pick: (row: Pair) => string[]) => {
    const seen = new Map<string, number>();
    for (const row of list) for (const value of pick(row)) if (value) seen.set(value, (seen.get(value) ?? 0) + 1);
    return [...seen]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .map(([name, n]) => ({ name, n }));
  };
  const out: Facet[] = [
    { key: "design", label: "Design", values: count((row) => [row.design]) },
    { key: "group", label: "Group", values: count((row) => [row.group]) },
    { key: "secondary", label: "Secondary", values: count((row) => row.secondary ?? []) },
  ];
  return out.filter((facet) => facet.values.length > 1 && (facet.key !== "design" || (facet.values.length <= FACET_CAP && facet.values.length < list.length)));
}

type Review = { title: string; link: string; status: string; rating: number; count: number };

function reviews(site_: Site): Record<string, Review> {
  const file = site_.input("reviews").files[0];
  if (!file) return {};
  try {
    return JSON.parse(read(file));
  } catch {
    console.warn(`site: ${file} is not a reviews file, skipped`);
    return {};
  }
}

function tasks(site_: Site) {
  const found = new Map<string, Facets>();
  for (const file of site_.input("tasks").files) {
    try {
      const task = JSON.parse(read(file));
      if (task.key) found.set(task.key, facetsOf(task));
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
  let odd = 0;
  giftRows = [];
  for (const product of snapshot.products ?? []) {
    if (product.key.startsWith(GIFT_PREFIX)) {
      giftRows.push(product);
      continue;
    }
    if (product.vendor && product.vendor !== VENDOR) {
      console.warn(`site: vendor ${product.vendor} is unknown, ${product.key} skipped`);
      continue;
    }
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
    const primary = primaryOf(product.key);
    const design = designOf(product.key);
    if (!primary || !handleOf(product.key) || !isDesign(design)) {
      odd++;
      continue;
    }
    const facets = files.get(product.key);
    out.push({
      ...product,
      ...(facets ?? {}),
      primary,
      design,
      files: facets?.files ?? product.files ?? [],
      title: entry.title,
      category: entry.category,
      handle: entry.handle,
      link: entry.link,
      price: variant.price,
      variant: variant.id,
    });
  }
  if (odd) console.warn(`site: ${odd} products are not a {primary}-{slug}-{design} key, skipped`);
  return out;
}

const newest = (a: Row, b: Row) => (a.created < b.created ? 1 : a.created > b.created ? -1 : a.key < b.key ? 1 : -1);

function pairs(list: Row[], lone = false): Pair[] {
  const halves = new Map<string, Partial<Record<Primary, Row>>>();
  for (const row of list) {
    const id = `${row.type}-${row.design}`;
    halves.set(id, { ...(halves.get(id) ?? {}), [row.primary]: row });
  }
  const out: Pair[] = [];
  for (const [id, half] of halves) {
    const missing = PRIMARIES.filter((primary) => !half[primary]);
    if (missing.length && !lone) {
      console.warn(`site: ${id} has no ${missing.join(" or ")} sibling, skipped`);
      continue;
    }
    const light = (half.light ?? half.dark) as Row;
    const dark = (half.dark ?? half.light) as Row;
    out.push({ ...light, secondary: [...new Set([...light.secondary, ...dark.secondary])], light, dark });
  }
  return out.sort(newest);
}

const shuffle = <T>(list: T[]) => {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
};

const newestFirst = (list: Pair[]) => {
  const seen = new Set<string>();
  const first: Pair[] = [];
  const rest: Pair[] = [];
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

type Design = { design: string; count: number; created: string; released: string };

function collect(site_: Site) {
  const catalogFile = site_.input("catalog").files[0];
  const reviewsFile = site_.input("reviews").files[0];
  const rated = reviews(site_);
  const catalog = JSON.parse(read(catalogFile)) as Catalog[];
  chromeRows = catalog.map((one) => ({ category: one.category, title: one.title, handle: one.handle }));
  const every = rows(site_, catalog);
  const all = pairs(every.filter((row) => row.released));
  const pending = pairs(every.filter((row) => !row.released), true);
  const index = site_.input("feed").files[0] ?? site_.input("feed").path;
  const shown = feed(site_);
  const byType = new Map<string, Pair[]>();
  for (const row of all) byType.set(row.type, [...(byType.get(row.type) ?? []), row]);
  const pendingByType = new Map<string, Pair[]>();
  for (const row of pending) pendingByType.set(row.type, [...(pendingByType.get(row.type) ?? []), row]);
  const inCategory = (slug: string) => all.filter((row) => row.category === slug);
  const ofProduct = (entry: Catalog) => byType.get(String(entry.id)) ?? [];
  const categoryCards: Card[] = [
    { name: "All", href: SHOP, count: all.length },
    ...CATEGORIES.map(([slug, name]) => ({ name, href: `${SHOP}${slug}/`, count: inCategory(slug).length })),
  ];
  const productCards = (slug?: string): Card[] =>
    catalog
      .filter((entry) => (!slug || entry.category === slug) && ofProduct(entry).length)
      .map((entry) => ({ name: entry.title, href: shopRoute(entry), count: ofProduct(entry).length }));
  const sameCategoryFirst = (row: Pair) => (a: Pair, b: Pair) => Number(b.category === row.category) - Number(a.category === row.category) || (a.created < b.created ? 1 : -1);
  const matching = (row: Pair): Pair[] => all.filter((one) => one.design === row.design && one.type !== row.type).sort(sameCategoryFirst(row)).slice(0, MATCH);
  const alike = (row: Pair): Pair[] => {
    const seen = new Set<string>([row.type]);
    const out: Pair[] = [];
    const ranked = all.filter((one) => one.type !== row.type && one.design !== row.design).sort(sameCategoryFirst(row));
    for (const one of ranked) {
      if (seen.has(one.type)) continue;
      seen.add(one.type);
      out.push(one);
      if (out.length === ALIKE) break;
    }
    return out;
  };
  const routes: Route[] = [];
  const sections = CATEGORIES.map(([slug, name]) => ({ slug, name, products: shuffle(inCategory(slug)).slice(0, HOME_ROW) })).filter((one) => one.products.length);
  const designs = [...new Set(all.map((row) => row.design))]
    .map((design) => {
      const mine = all.filter((row) => row.design === design);
      return { design, count: mine.length, created: mine[0].created, released: mine[0].released };
    })
    .sort((a, b) => (a.released < b.released ? 1 : -1));
  const fresh = designs[0] ? { ...designs[0], products: newestFirst(all.filter((row) => row.design === designs[0].design)).slice(0, HOME_ROW - 1) } : null;
  routes.push({ route: "/", kind: "home", name: site.name, data: { products: newestFirst(all), designs, sections, fresh }, inputs: [catalogFile, index], at: today() });
  routes.push({ route: `${SHOP}designs/`, kind: "designs", name: "Designs", data: { trail: [{ name: "Shop", href: SHOP }, { name: "Designs" }], title: "Designs", lead: `${plural(designs.length, "design")}, one moon each.`, designs }, inputs: [catalogFile, index], at: today() });
  routes.push({
    route: SHOP,
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
      current: SHOP,
      products: newestFirst(all),
      facets: facetsFor(all),
    },
    inputs: [catalogFile],
    at: today(),
  });
  for (const [slug, name] of CATEGORIES) {
    const list = inCategory(slug);
    routes.push({
      route: `${SHOP}${slug}/`,
      kind: "shop",
      name,
      data: {
        trail: [{ name: "Shop", href: SHOP }, { name }],
        title: name,
        lead: `${plural(list.length, "variation")}.`,
        chips: [
          { label: "Categories", cards: categoryCards },
          { label: "Products", cards: productCards(slug) },
        ],
        current: `${SHOP}${slug}/`,
        products: newestFirst(list),
        facets: facetsFor(list),
      },
      inputs: [catalogFile],
      at: today(),
    });
  }
  const names = new Map(CATEGORIES);
  for (const entry of catalog) {
    if (SHOP_RESERVED.has(entry.handle)) throw new Error(`site: product handle ${entry.handle} collides with the shop route ${SHOP}${entry.handle}/`);
    const list = ofProduct(entry);
    routes.push({
      route: shopRoute(entry),
      kind: "shop",
      name: entry.title,
      hidden: !list.length,
      data: {
        trail: [{ name: "Shop", href: SHOP }, { name: names.get(entry.category) ?? entry.category, href: `${SHOP}${entry.category}/` }, { name: entry.title }],
        title: entry.title,
        lead: `${plural(list.length, "variation")}.`,
        chips: [{ label: "Products", cards: productCards(entry.category) }],
        current: shopRoute(entry),
        products: list,
        facets: facetsFor(list),
        tiles: true,
        noindex: !list.length,
      },
      inputs: [catalogFile],
      at: today(),
    });
  }
  for (const row of all) {
    routes.push({
      route: productUrl(row.key),
      kind: "product",
      name: row.title,
      hidden: true,
      data: { product: row, family: byType.get(row.type) ?? [row], matching: matching(row), alike: alike(row), review: rated[row.type] ?? null, preview: false },
      inputs: reviewsFile ? [catalogFile, reviewsFile] : [catalogFile],
      at: row.created.slice(0, 10),
    });
  }
  for (const row of pending) {
    routes.push({
      route: productUrl(row.key),
      kind: "product",
      name: row.title,
      hidden: true,
      data: { product: row, family: pendingByType.get(row.type) ?? [row], matching: [], alike: alike(row), review: rated[row.type] ?? null, preview: true },
      inputs: reviewsFile ? [catalogFile, reviewsFile] : [catalogFile],
      at: row.created.slice(0, 10),
    });
  }
  routes.push({ route: "/cart/", kind: "cart", name: "Bag", at: today(), hidden: true });
  routes.push({ route: "/automator/", kind: "automator", name: "Automator", at: today(), hidden: true, data: { pending } });
  routes.push({ route: "/stats/", kind: "stats", name: "Stats", at: today(), hidden: true });
  const notes: Record<string, string> = {};
  const readme = site_.input("readme").files[0];
  if (readme) {
    const doc = sheet(read(readme));
    notes["/about/"] = doc.text;
    routes.push({ route: "/about/", kind: "page", name: doc.title || "About", source: readme, inputs: [readme], at: today() });
  }
  for (const file of site_.input("pages").files) {
    const name = basename(file, ".md");
    if (RESERVED.has(name)) throw new Error(`site: page ${name} wants a reserved route`);
    const route = docUrl(name);
    const doc = sheet(read(file));
    notes[route] = doc.text;
    routes.push({ route, kind: "page", name: doc.title || name, source: file, inputs: [file], at: today() });
  }
  const gifts: Gift[] = [];
  for (const tier of TIERS) {
    const found = giftRows.find((row) => row.key === `${GIFT_PREFIX}${tier.tier}`);
    if (found && found.variants.length) gifts.push({ ...tier, product: found });
    else console.warn(`site: no ${GIFT_PREFIX}${tier.tier} product with variants, skipped`);
  }
  if (gifts.length) {
    routes.push({ route: GIFT, kind: "gifts", name: "Gift Card", data: { cards: gifts }, at: today() });
    for (const card of gifts) routes.push({ route: giftUrl(card.tier), kind: "gift", name: `${card.name} Gift Card`, data: { card, cards: gifts }, at: card.product.created.slice(0, 10) });
  }
  const groups = [
    { name: "Pages", rows: PAGES.filter((one) => one.href !== GIFT || gifts.length).map((one) => ({ ...one, note: one.note || notes[one.href] || "" })) },
    { name: "Shop", rows: [{ name: "All", href: SHOP, note: "Every live variation." }, { name: "Designs", href: `${SHOP}designs/`, note: "One tile per design." }, ...CATEGORIES.map(([slug, name]) => ({ name, href: `${SHOP}${slug}/`, note: `${name} variations.` }))] },
    { name: "Files", rows: FILES },
  ];
  routes.push({ route: "/pages/", kind: "pages", name: "Pages", data: { groups }, inputs: [...site_.input("pages").files, ...(readme ? [readme] : [])], at: today() });
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
  const found = [
    ...CATEGORIES.map(([slug, name]) => ({ name, href: `${SHOP}${slug}/`, kind: "Category" })),
    ...catalog.filter((entry) => ofProduct(entry).length).map((entry) => ({ name: entry.title, href: shopRoute(entry), kind: "Product" })),
    ...all.map((row) => ({ name: `${row.title} ${row.design}`, href: productUrl(row.key), kind: "Variation", tags: [row.group, ...(row.secondary ?? [])].filter(Boolean).join(" ") })),
    ...shown.map((post) => ({ name: post.name, href: postRoute(post.name), kind: "Post" })),
    ...DOCS.map((one) => ({ name: one.name, href: one.href, kind: "Page" })),
    { name: "Pages", href: "/pages/", kind: "Page" },
  ];
  routes.push({ route: "/search.json", kind: "search", name: "Search", hidden: true, data: { found }, inputs: [catalogFile, index] });
  routes.push({ route: "/404.html", kind: "missing", name: "Not found", hidden: true });
  return routes;
}

/* RENDER */

const previewOf = (row: Pair) => {
  const image = row.images[0];
  return image ? `${image.url}${image.url.includes("?") ? "&" : "?"}width=1200` : undefined;
};

const describe = (row: Pair) => `${row.title} by ${site.name}. USD ${Number(row.price).toFixed(2)}. One design, one moon of ${Math.round(LIVE_DAYS)} days.`;

function cover(products: Pair[]) {
  const first = products[0];
  if (!first) return FALLBACK;
  return first.images[0] ? grid(first.images[0].url, 1200) : FALLBACK;
}

function draw(site_: Site, route: Route): Output[] {
  const at = route.route === "/404.html" ? "404.html" : page(route.route);
  if (route.kind === "home") {
    const { products, designs, sections, fresh } = route.data as { products: Pair[]; designs: Design[]; sections: { slug: string; name: string; products: Pair[] }[]; fresh: (Design & { products: Pair[] }) | null };
    const props = {
      designs: designs.map(moon),
      sections: sections.map((one) => ({ slug: one.slug, name: one.name, products: one.products.map(card) })),
      fresh: fresh ? { ...moon(fresh), products: fresh.products.map(card) } : null,
    };
    return shell(site_, at, { route: route.route, name: site.name, description: site.tagline, image: cover(products), fly: true }, { kind: "home", props });
  }
  if (route.kind === "shop") {
    const data = route.data as { trail: Crumb[]; title: string; lead: string; chips: { label: string; cards: Card[] }[]; current: string; products: Pair[]; facets: Facet[]; tiles?: boolean; noindex?: boolean };
    const props = { trail: data.trail, title: data.title, lead: data.lead, chips: data.chips, current: data.current, products: data.products.map(card), facets: data.facets, tiles: data.tiles ?? false };
    const leaf = { route: route.route, name: data.title, description: `${data.title}: ${data.lead}`, image: cover(data.products), noindex: data.noindex };
    return shell(site_, at, leaf, { kind: "shop", props });
  }
  if (route.kind === "designs") {
    const data = route.data as { trail: Crumb[]; title: string; lead: string; designs: Design[] };
    const props = { trail: data.trail, title: data.title, lead: data.lead, designs: data.designs.map(moon) };
    return shell(site_, at, { route: route.route, name: data.title, description: `${data.title}: ${data.lead}` }, { kind: "designs", props });
  }
  if (route.kind === "feed") {
    const { posts: shown } = route.data as { posts: Post[] };
    return shell(site_, at, { route: route.route, name: "Feed", description: `The feed: ${plural(shown.length, "post")}, newest first.` }, { kind: "feed", props: { posts: shown.map(teaser) } });
  }
  if (route.kind === "search") return [{ path: "search.json", bytes: JSON.stringify((route.data as { found: unknown[] }).found) }];
  if (route.kind === "product") return product(site_, route, at);
  if (route.kind === "post") return post(site_, route, at);
  if (route.kind === "automator") {
    const { pending } = route.data as { pending: Pair[] };
    const leaf = { route: route.route, name: "Automator", description: "The automator's last tick, its batch and its log.", noindex: true };
    return shell(site_, at, leaf, { kind: "automator", props: { pending: pending.map(card) } });
  }
  if (route.kind === "stats") {
    const leaf = { route: route.route, name: "Stats", description: "The CDN, the Lambdas and the bucket.", noindex: true };
    return shell(site_, at, leaf, { kind: "stats", props: {} });
  }
  if (route.kind === "cart") {
    return shell(site_, at, { route: route.route, name: "Bag", description: "Your bag.", noindex: true }, { kind: "cart", props: {} });
  }
  if (route.kind === "pages") {
    const { groups } = route.data as { groups: { name: string; rows: { name: string; href: string; note: string }[] }[] };
    return shell(site_, at, { route: route.route, name: "Pages", description: "Every route this site serves." }, { kind: "pages", props: { groups } });
  }
  if (route.kind === "gifts") {
    const { cards } = route.data as { cards: Gift[] };
    const leaf = { route: route.route, name: "Gift Card", description: "Three sizes, nine angel numbers each. Sent by email, never expires." };
    return shell(site_, at, leaf, { kind: "gifts", props: { cards: cards.map(tier) } });
  }
  if (route.kind === "gift") {
    const { card: one, cards } = route.data as { card: Gift; cards: Gift[] };
    const leaf = { route: route.route, name: `${one.name} Gift Card`, description: `${one.name} gift card, angel numbers from $${one.from} to $${one.to}. Sent by email, never expires.`, preconnect: STORE_ORIGIN };
    const props = { card: tier(one), cards: cards.map((each) => ({ tier: each.tier, name: each.name })), product: { key: one.product.key, available: one.product.available, variants: one.product.variants }, buyPrefix: BUY };
    return shell(site_, at, leaf, { kind: "gift", props });
  }
  if (route.kind === "page") {
    const source = route.source as string;
    const doc = sheet(read(source), (url) => resolveLink(site_, source, url));
    const leaf = { route: route.route, name: doc.title || route.name!, description: doc.text };
    return shell(site_, at, leaf, { kind: "page", props: { title: doc.title || route.name!, lead: doc.lead, body: doc.body } });
  }
  const leaf = { route: route.route, name: "Not found", description: "That page is gone, or its moon has passed.", noindex: true };
  return shell(site_, "404.html", leaf, { kind: "missing", props: {} });
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
  const props = { post: one, prev: prev ? { name: prev.name } : null, next: next ? { name: next.name } : null };
  return shell(site_, at, leaf, { kind: "post", props });
}

function product(site_: Site, route: Route, at: string): Output[] {
  const { product: row, family, matching, alike, review, preview } = route.data as { product: Pair; family: Pair[]; matching: Pair[]; alike: Pair[]; review: Review | null; preview: boolean };
  const names = new Map(CATEGORIES);
  const trail: Crumb[] = [
    { name: "Shop", href: SHOP },
    { name: names.get(row.category) ?? row.category, href: `${SHOP}${row.category}/` },
    { name: row.title, href: shopRoute(row) },
    { name: row.design },
  ];
  const props = {
    trail,
    product: { title: row.title, design: row.design, light: half(row.light), dark: half(row.dark) },
    family: family.map((one) => ({ design: one.design, href: productUrl(one.key) })),
    matching: matching.map(card),
    alike: alike.map(card),
    printful: PRINTFUL + row.link,
    shop: shopRoute(row),
    tiles: TILES,
    buyPrefix: BUY,
    review,
    preview,
  };
  const data = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: row.title,
    sku: row.key,
    image: previewOf(row),
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
  const leaf = { route: route.route, name: row.title, description: describe(row), image: previewOf(row), data, noindex: true, preconnect: STORE_ORIGIN };
  return shell(site_, at, leaf, { kind: "product", props });
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
  inline: INLINE,
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
