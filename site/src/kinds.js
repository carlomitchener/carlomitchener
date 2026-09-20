const made = new Map();

let loader = async () => {};

export const put = (kind, one) => made.set(kind, one);

export const got = (kind) => made.get(kind);

export const lazy = (fn) => (loader = fn);

export const need = (kind) => loader(kind);
