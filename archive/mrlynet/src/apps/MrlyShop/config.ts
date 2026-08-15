export { CATEGORY_NAMES as CATEGORIES } from "./categories";
export { SHOP_URL } from "./cart";

export const API_URL = "https://1332b7-26.myshopify.com/api/2026-01/graphql.json";
export const PUBLIC_TOKEN = "40721a2494bd56d85b09daa4ab995506";

export const PRODUCT_COUNT = 1000;

export const IMAGE_SIZE = 1000;
export const IMAGE_FORMAT = "webp";
export const CDN_PREFIX = "https://cdn.shopify.com/s/files/1/0657/6360/6710/files/";

import { cdnUrl } from "../../lib/browser/cdn";
export const CDN_BASE = cdnUrl("mrlyshop/files");

export const PRINTFUL_URL = "https://www.printful.com/custom/products/all/";

export const EXPIRED_TIME = 24 * 60 * 60 * 1000 * 365;
export const CACHE_TIME = 15 * 60 * 1000;

export const MOCKUP_FORMAT = "png";
export const TILE_FORMAT = "png";

export const QUERY = `
query HomePage($first: Int!, $after: String, $query: String, $country: CountryCode) @inContext(country: $country) {
  products(first: $first, sortKey: CREATED_AT, reverse: true, after: $after, query: $query) {
    pageInfo {
      hasNextPage
      endCursor
    }
    nodes {
      id
      handle
      productType
      createdAt
      variants(first: 50) {
        nodes {
          id
          price { amount }
          selectedOptions { name value }
        }
      }
      media(first: 100) {
        nodes {
          ... on MediaImage {
            image {
              url
              altText
            }
          }
        }
      }
    }
  }
}
`;
