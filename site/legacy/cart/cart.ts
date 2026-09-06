import type { CartItem } from "./types";
import { getItem, setItem, removeItem } from "../../../lib/browser/storage";

const STORAGE_KEY = "mrly_cart";
export const SHOP_URL = "https://{shop}/cart/";

export function loadCart(): CartItem[] {
  try {
    const raw = getItem(STORAGE_KEY);
    if (!raw) return [];
    const items = JSON.parse(raw) as CartItem[];
    return Array.isArray(items) ? items : [];
  } catch {
    return [];
  }
}

function notifyChange(): void {
  window.dispatchEvent(new Event("mrly_cart_change"));
}

function saveCart(items: CartItem[]): void {
  setItem(STORAGE_KEY, JSON.stringify(items));
  notifyChange();
}

export function addToCart(item: Omit<CartItem, "quantity">): void {
  const items = loadCart();
  const existing = items.find((i) => i.variantId === item.variantId);
  if (existing) {
    existing.quantity += 1;
  } else {
    items.push({ ...item, quantity: 1 });
  }
  saveCart(items);
}

export function removeFromCart(variantId: string): void {
  const items = loadCart().filter((i) => i.variantId !== variantId);
  saveCart(items);
}

export function updateQuantity(variantId: string, quantity: number): void {
  if (quantity < 1) {
    removeFromCart(variantId);
    return;
  }
  const items = loadCart();
  const item = items.find((i) => i.variantId === variantId);
  if (item) {
    item.quantity = quantity;
    saveCart(items);
  }
}

export function clearCart(): void {
  removeItem(STORAGE_KEY);
  notifyChange();
}

export function getCartCount(items: CartItem[]): number {
  return items.reduce((sum, item) => sum + item.quantity, 0);
}

export function getCartTotal(items: CartItem[]): string {
  const total = items.reduce((sum, item) => sum + parseFloat(item.price) * item.quantity, 0);
  return total.toFixed(2);
}

export function getCheckoutUrl(items: CartItem[]): string {
  if (!items.length) return "";
  const parts = items.map((item) => `${item.variantId}:${item.quantity}`);
  return `${SHOP_URL}${parts.join(",")}`;
}
