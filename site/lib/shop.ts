export type Variant = { id: string; size: string; price: string; available: boolean };

export type Picture = { url: string; alt: string; style: string };

export type ProductRow = {
  key: string;
  type: string;
  created: string;
  available: boolean;
  variants: Variant[];
  images: Picture[];
  files: string[];
};

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
      variants(first: 100) {
        nodes {
          id
          price { amount }
          availableForSale
          selectedOptions { name value }
        }
      }
      media(first: 50) {
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
    type: String(node.productType ?? ""),
    created: node.createdAt,
    available: node.availableForSale !== false,
    variants: (node.variants?.nodes ?? []).map(variantOf),
    images: picturesOf(node.media?.nodes ?? []),
    files: [],
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

/* ART */

export const artUrl = (key: string, name: string) => `/art/${key}/${name}.png`;

export const tileUrl = (key: string, n: number) => artUrl(key, `${key}-${n}`);

export const ogUrl = (key: string) => artUrl(key, `${key}-og`);

export const grid = (url: string, width: number) => `${url}${url.includes("?") ? "&" : "?"}width=${width}&format=auto`;

export const money = (amount: string) => `$${Number(amount).toFixed(2)}`;

export const expiry = (created: string, live: number) => new Date(created).getTime() + live * 24 * 60 * 60 * 1000;
