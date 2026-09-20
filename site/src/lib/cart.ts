import { CART_KEY } from "../config/shop.ts";

declare const SHOP: string;

export type Line = { id: string; key: string; title: string; size: string; price: string; image: string; qty: number };

/* STORE */

const EMPTY: Line[] = [];

const shop = () => (typeof SHOP === "string" ? SHOP : "");

const listeners = new Set<() => void>();

let lines: Line[] = EMPTY;

let ready = false;

function read(): Line[] {
  try {
    const raw = localStorage.getItem(CART_KEY);
    const items = raw ? JSON.parse(raw) : [];
    return Array.isArray(items) ? items : EMPTY;
  } catch {
    return EMPTY;
  }
}

const tell = () => {
  for (const fn of listeners) fn();
};

const sync = (event: StorageEvent) => {
  if (event.key && event.key !== CART_KEY) return;
  lines = read();
  tell();
};

export function load(): Line[] {
  if (!ready && typeof window !== "undefined") {
    ready = true;
    lines = read();
  }
  return lines;
}

export const server = () => EMPTY;

export function subscribe(fn: () => void) {
  if (!listeners.size) addEventListener("storage", sync);
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
    if (!listeners.size) removeEventListener("storage", sync);
  };
}

export function save(items: Line[]) {
  try {
    if (items.length) localStorage.setItem(CART_KEY, JSON.stringify(items));
    else localStorage.removeItem(CART_KEY);
  } catch {}
  ready = true;
  lines = items;
  tell();
  return items;
}

export function add(line: Omit<Line, "qty">) {
  const items = load().map((item) => ({ ...item }));
  const found = items.find((item) => item.id === line.id);
  if (found) found.qty += 1;
  else items.push({ ...line, qty: 1 });
  return save(items);
}

export const remove = (id: string) => save(load().filter((item) => item.id !== id));

export function setQty(id: string, qty: number) {
  if (qty < 1) return remove(id);
  return save(load().map((item) => (item.id === id ? { ...item, qty } : item)));
}

export const clear = () => save([]);

/* SUMS */

export const count = (items: Line[]) => items.reduce((sum, item) => sum + item.qty, 0);

export const total = (items: Line[]) => items.reduce((sum, item) => sum + Number(item.price) * item.qty, 0).toFixed(2);

export const checkoutUrl = (items: Line[]) => (items.length && shop() ? `https://${shop()}/cart/${items.map((item) => `${item.id}:${item.qty}`).join(",")}` : "");
