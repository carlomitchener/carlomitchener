import { got, lazy, put } from "../kinds.js";
import { wear } from "./sheets.ts";

const LOAD: Record<string, () => Promise<unknown>> = {
  home: () => import("../pages/Home.jsx").then((one) => one.Home),
  shop: () => import("../pages/Shop.jsx").then((one) => one.Shop),
  designs: () => import("../pages/Designs.jsx").then((one) => one.Designs),
  product: () => import("../pages/Product.jsx").then((one) => one.Product),
  post: () => import("../pages/Post.jsx").then((one) => one.Post),
  feed: () => import("../pages/Feed.jsx").then((one) => one.Feed),
  cart: () => import("../pages/Cart.jsx").then((one) => one.Cart),
  code: () => import("../pages/Code.jsx").then((one) => one.Code),
  automator: () => import("../pages/Automator.jsx").then((one) => one.Automator),
  stats: () => import("../pages/Stats.jsx").then((one) => one.Stats),
  pages: () => import("../pages/Pages.jsx").then((one) => one.Pages),
  gifts: () => import("../pages/GiftCard.jsx").then((one) => one.GiftCards),
  gift: () => import("../pages/GiftCard.jsx").then((one) => one.GiftCard),
  page: () => import("../pages/Doc.jsx").then((one) => one.Doc),
  blog: () => import("../pages/Blog.jsx").then((one) => one.Blog),
};

async function code(kind: string) {
  if (got(kind)) return;
  const one = LOAD[kind];
  if (!one) return;
  put(kind, await one());
}

export async function load(kind: string) {
  await Promise.all([code(kind), wear(kind)]);
}

lazy(load);
