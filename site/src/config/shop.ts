import { FEED_ROUTE } from "../lib/feed.ts";

export const API = "2026-07";

export const COUNTRY = "US";

export const LIVE_DAYS = 29.53;

export const CDN = "/cdn/printful";

export const SHOPIFY_CDN = "https://cdn.shopify.com";

export const PRINTFUL = "https://www.printful.com/custom/products/all/";

export const TILES = [1, 3, 5, 7, 9];

export const CART_KEY = "cm-cart";

export const MODE_KEY = "cm-mode";

export const THEME_COLORS = { light: "#f8f8f9", dark: "#0b0b0c" };

export const CATEGORIES: [string, string][] = [
  ["accessories", "Accessories"],
  ["bags", "Bags"],
  ["kids", "Kids"],
  ["men", "Men"],
  ["unisex", "Unisex"],
  ["women", "Women"],
  ["youth", "Youth"],
];

/* ROUTES */

export const SHOP = "/shop/";

export const GIFT = `${SHOP}gift-card/`;

export const SHOP_DOCS = ["shipping", "faq", "terms"];

export const docUrl = (name: string) => (SHOP_DOCS.includes(name) ? `${SHOP}${name}/` : `/${name}/`);

const NAMED: [string, string][] = [
  ["About", "about"],
  ["Contact", "contact"],
  ["FAQ", "faq"],
  ["Shipping", "shipping"],
  ["Terms", "terms"],
  ["Privacy", "privacy"],
];

export const DOCS = NAMED.map(([name, slug]) => ({ name, href: docUrl(slug) }));

export const SITE = [
  { name: "Home", href: "/", note: "The newest design and the newest variations." },
  { name: "Shop", href: SHOP, note: "Every live variation." },
  { name: "Feed", href: FEED_ROUTE, note: "Every post, newest first." },
  { name: "Gift Card", href: GIFT, note: "Mini, medi and maxi. Angel numbers." },
  { name: "Status", href: "/status/", note: "The automator, the CDN and the Lambdas." },
  { name: "Bag", href: "/cart/", note: "Your bag." },
  { name: "Pages", href: "/pages/", note: "This list." },
];

export const PAGES = [...SITE, ...DOCS.map((one) => ({ ...one, note: "" }))];

export const FILES = [
  { name: "robots.txt", href: "/robots.txt", note: "Who may crawl, and where the sitemap is." },
  { name: "llms.txt", href: "/llms.txt", note: "The site on one page, for machines." },
  { name: "sitemap.xml", href: "/sitemap.xml", note: "Every indexable route with its date." },
  { name: "manifest.webmanifest", href: "/manifest.webmanifest", note: "The web app manifest." },
  { name: "search.json", href: "/search.json", note: "The search index the header reads." },
  { name: "404", href: "/404.html", note: "Not found, or its moon has passed." },
];

export type Catalog = { id: number; category: string; title: string; technique: string; link: string; handle: string };

export const MORE_TILE = 3;

export const ALIKE = 4;

export const MATCH = 4;

export const HELP = {
  delivery: "https://help.printful.com/hc/articles/360017631360",
  shipping: "https://www.printful.com/shipping",
  countries: "https://help.printful.com/hc/articles/360014066779",
  customs: "https://help.printful.com/hc/articles/360014066159",
  updates: "https://www.printful.com/recent-updates",
  status: "https://www.printfulstatus.com/",
  disclaimers: "https://help.printful.com/hc/articles/21140050579740",
  aop: "https://help.printful.com/hc/articles/21045992765468",
  aopMore: "https://help.printful.com/hc/articles/360014007460",
};

export const HOME_ROW = 8;

export const FOOT_COLUMNS = 5;
