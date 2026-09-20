import { CDN, GIFT, SHOP } from "../config/shop.ts";

type Variant = { id: string; size: string; price: string; available: boolean };

type Picture = { url: string; alt: string; style: string };

export type Primary = "light" | "dark";

export const PRIMARIES: Primary[] = ["light", "dark"];

export type ProductRow = {
  key: string;
  design: string;
  primary: Primary | "";
  type: string;
  vendor: string;
  created: string;
  released: string;
  available: boolean;
  variants: Variant[];
  images: Picture[];
  files: string[];
  group: string;
  secondary: string[];
};

export type Facets = { files: string[]; design: string; group: string; secondary: string[] };

export type Batch = { design: string; created: string; released: string };

export const primaryOf = (key: string): Primary | "" => {
  const first = String(key ?? "").split("-")[0];
  return first === "light" || first === "dark" ? first : "";
};

export const primaryName = (primary: Primary) => (primary === "dark" ? "Dark" : "Light");

export const designOf = (key: string) => String(key ?? "").split("-").pop() ?? "";

export const isDesign = (text: string) => /^[0-9a-f]{8}$/.test(text);

export const handleOf = (key: string) => String(key ?? "").split("-").slice(1, -1).join("-");

export const productUrl = (key: string) => `${SHOP}${handleOf(key)}/${designOf(key)}/`;

export const collectionUrl = (handle: string) => `${SHOP}${handle}/`;

export const GIFT_PREFIX = "gift-card-";

export const giftUrl = (tier: string) => `${GIFT}${tier}/`;

export const buyHref = (prefix: string, id: string) => (prefix && id ? `${prefix}${id}:1` : "/cart/");

export const lineUrl = (key: string) => (key.startsWith(GIFT_PREFIX) ? giftUrl(key.slice(GIFT_PREFIX.length)) : productUrl(key));

export function facetsOf(task: any): Facets {
  const variation = task?.variation ?? {};
  return {
    files: (task?.printfiles ?? []).map((one: { name: string }) => one.name).filter(Boolean),
    design: task?.design ?? designOf(task?.key ?? ""),
    group: variation.tile?.group ?? "",
    secondary: variation.paint?.secondary ?? [],
  };
}

type Snapshot = { at: number; products: ProductRow[]; batches: Batch[] };

const QUERY = `
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

const tail = (gid: string) => gid.split("/").pop() ?? gid;

const styleOf = (alt: string) => alt.split(" - ")[0].trim();

function variantOf(node: any): Variant {
  const size = (node.selectedOptions ?? []).find((o: any) => o.name === "Size")?.value ?? "One Size";
  return { id: tail(node.id), size, price: node.price.amount, available: node.availableForSale !== false };
}

function picturesOf(nodes: any[]): Picture[] {
  const out: Picture[] = [];
  for (const node of nodes ?? []) {
    if (node.mediaContentType !== "IMAGE") continue;
    const alt = node.image?.altText ?? "";
    if (alt.includes(TILE)) continue;
    out.push({ url: node.image.url, alt, style: styleOf(alt) });
  }
  return out;
}

function rowOf(node: any): ProductRow {
  return {
    key: node.handle,
    design: designOf(node.handle),
    primary: primaryOf(node.handle),
    type: String(node.productType ?? ""),
    vendor: String(node.vendor ?? ""),
    created: node.createdAt,
    released: "",
    available: node.availableForSale !== false,
    variants: (node.variants?.nodes ?? []).map(variantOf),
    images: picturesOf(node.media?.nodes ?? []),
    files: [],
    group: "",
    secondary: [],
  };
}

/* FETCH */

type Wire = { shop: string; token: string; api: string; country: string; live: number };

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

export const tileUrl = (design: string, primary: Primary, n: number) => cdnUrl(design, `${primary}-tile-${n}`);

export const grid = (url: string, width: number) => `${url}${url.includes("?") ? "&" : "?"}width=${width}&format=auto`;

export const money = (amount: string | number) => `$${Number(amount).toFixed(2)}`;
