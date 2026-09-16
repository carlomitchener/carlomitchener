export const API = "2026-07";

export const COUNTRY = "US";

export const LIVE_DAYS = 29.53;

export const CDN = "/cdn/printful";

export const SHOPIFY_CDN = "https://cdn.shopify.com";

export const PRINTFUL = "https://www.printful.com/custom/products/all/";

export const TILES = [1, 3, 5, 7, 9];

export const CART_KEY = "cm-cart";

export const CATEGORIES: [string, string][] = [
  ["accessories", "Accessories"],
  ["bags", "Bags"],
  ["kids", "Kids"],
  ["men", "Men"],
  ["unisex", "Unisex"],
  ["women", "Women"],
  ["youth", "Youth"],
];

export type Catalog = { id: number; live: boolean; category: string; title: string; link: string; handle: string };
