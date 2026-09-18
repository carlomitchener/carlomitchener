import { CDN } from "../config/shop.ts";

export type Variant = { id: string; size: string; price: string; available: boolean };

export type Picture = { url: string; alt: string; style: string };

export type ProductRow = {
  key: string;
  design: string;
  type: string;
  vendor: string;
  created: string;
  available: boolean;
  variants: Variant[];
  images: Picture[];
  files: string[];
  group: string;
  primary: string;
  secondary: string[];
};

export type Facets = { files: string[]; design: string; group: string; primary: string; secondary: string[] };

export const designOf = (handle: string) => String(handle ?? "").split("-")[0];

export const handleOf = (key: string) => String(key ?? "").split("-").slice(1).join("-");

export const productUrl = (key: string) => `/${handleOf(key)}/${designOf(key)}/`;

export const collectionUrl = (handle: string) => `/${handle}/`;

export const GIFT = "/gift-card/";

export const GIFT_PREFIX = "gift-card-";

export const giftUrl = (tier: string) => `${GIFT}${tier}/`;

export const lineUrl = (key: string) => (key.startsWith(GIFT_PREFIX) ? giftUrl(key.slice(GIFT_PREFIX.length)) : productUrl(key));

export function facetsOf(task: any): Facets {
  const variation = task?.variation ?? {};
  return {
    files: (task?.printfiles ?? []).map((one: { name: string }) => one.name).filter(Boolean),
    design: task?.design ?? designOf(task?.key ?? ""),
    group: variation.tile?.group ?? "",
    primary: variation.paint?.primary ?? "",
    secondary: variation.paint?.secondary ?? [],
  };
}

export type Snapshot = { at: number; products: ProductRow[] };

export const QUERY = `
query Feed($first: Int!, $after: String, $country: CountryCode) @inContext(country: $country) {
  products(first: $first, sortKey: CREATED_AT, reverse: true, after: $after) {
    pageInfo { hasNextPage endCursor }
    nodes {
      id
      handle
      createdAt
      availableForSale
      productType
      vendor
      variants(first: 100) {
        nodes {
          id
          price { amount }
          availableForSale
          selectedOptions { name value }
        }
      }
      media(first: 250) {
        nodes {
          mediaContentType
          ... on MediaImage { image { url altText } }
        }
      }
    }
  }
}
`;

const TILE = " - Tile - ";

export const tail = (gid: string) => gid.split("/").pop() ?? gid;

export const styleOf = (alt: string) => alt.split(" - ")[0].trim();

export function variantOf(node: any): Variant {
  const size = (node.selectedOptions ?? []).find((o: any) => o.name === "Size")?.value ?? "One Size";
  return { id: tail(node.id), size, price: node.price.amount, available: node.availableForSale !== false };
}

export function picturesOf(nodes: any[]): Picture[] {
  const out: Picture[] = [];
  for (const node of nodes ?? []) {
    if (node.mediaContentType !== "IMAGE") continue;
    const alt = node.image?.altText ?? "";
    if (alt.includes(TILE)) continue;
    out.push({ url: node.image.url, alt, style: styleOf(alt) });
  }
  return out;
}

export function rowOf(node: any): ProductRow {
  return {
    key: node.handle,
    design: designOf(node.handle),
    type: String(node.productType ?? ""),
    vendor: String(node.vendor ?? ""),
    created: node.createdAt,
    available: node.availableForSale !== false,
    variants: (node.variants?.nodes ?? []).map(variantOf),
    images: picturesOf(node.media?.nodes ?? []),
    files: [],
    group: "",
    primary: "",
    secondary: [],
  };
}

/* FETCH */

export type Wire = { shop: string; token: string; api: string; country: string; live: number };

export async function feed(wire: Wire): Promise<ProductRow[]> {
  const url = `https://${wire.shop}/api/${wire.api}/graphql.json`;
  const cutoff = Date.now() - wire.live * 24 * 60 * 60 * 1000;
  const rows: ProductRow[] = [];
  let after: string | null = null;
  for (;;) {
    const reply = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json", "X-Shopify-Storefront-Access-Token": wire.token },
      body: JSON.stringify({ query: QUERY, variables: { first: 250, after, country: wire.country } }),
    });
    if (!reply.ok) throw new Error(`storefront: HTTP ${reply.status}`);
    const body: any = await reply.json();
    if (body.errors) throw new Error(`storefront: ${JSON.stringify(body.errors).slice(0, 300)}`);
    const page = body.data?.products;
    if (!page) throw new Error(`storefront: no products in the reply`);
    let stop = false;
    for (const node of page.nodes) {
      if (new Date(node.createdAt).getTime() < cutoff) {
        stop = true;
        break;
      }
      rows.push(rowOf(node));
    }
    if (stop || !page.pageInfo.hasNextPage) break;
    after = page.pageInfo.endCursor;
  }
  return rows;
}

/* CDN */

export const cdnUrl = (key: string, name: string) => (key ? `${CDN}/${key}/${name}.png` : "");

export const tileUrl = (key: string, n: number) => cdnUrl(key, `tile-${n}`);

export const grid = (url: string, width: number) => `${url}${url.includes("?") ? "&" : "?"}width=${width}&format=auto`;

export const money = (amount: string | number) => `$${Number(amount).toFixed(2)}`;

export const slugify = (text: string) => String(text ?? "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
