const SHARED = ["palette.css", "tokens.css", "base.css", "chrome.css", "sky.css"];

const EXTRA: Record<string, string[]> = {
  home: ["home.css", "shop.css"],
  shop: ["shop.css", "facets.css"],
  designs: ["home.css", "shop.css"],
  product: ["home.css", "shop.css"],
  post: ["home.css", "shop.css"],
  feed: ["shop.css"],
  cart: ["cart.css"],
  automator: ["doc.css", "shop.css"],
  stats: ["doc.css"],
  pages: ["doc.css"],
  gifts: ["gift.css", "shop.css"],
  gift: ["gift.css", "shop.css"],
  page: ["doc.css"],
  blog: ["doc.css", "shop.css", "blog.css"],
  missing: ["doc.css"],
  code: ["doc.css", "git.css"],
};

export const KIT_CODE = ["contract.css", "code.css", "seti/seti.css"];

export const KINDS = Object.keys(EXTRA);

export const CSS = [...new Set([...SHARED, ...Object.values(EXTRA).flat()])].sort();

export const sheetsFor = (kind: string) => [...SHARED, ...(EXTRA[kind] ?? [])].sort();
