// PROTOCOL

// PRODUCT

// VARIANT

// IMAGE

export type ImageTuple = [string, string];
export type VariantTuple = [string, string, string];
export type ProductTuple = [string, string, string, string, VariantTuple[], ImageTuple[]];

export const P = { ID: 0, HANDLE: 1, PRODUCT_TYPE: 2, CREATED_AT: 3, VARIANTS: 4, IMAGES: 5 } as const;
export const V = { ID: 0, SIZE: 1, PRICE: 2 } as const;
export const I = { KEY: 0, ALT: 1 } as const;

export type Products = Record<string, string>;
