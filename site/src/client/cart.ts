import { CART_KEY } from "../config/shop.ts";
import { money, productUrl } from "../lib/shop.ts";

declare const SHOP: string;

export type Line = { id: string; key: string; title: string; size: string; price: string; image: string; qty: number };

/* STORE */

export function load(): Line[] {
  try {
    const raw = localStorage.getItem(CART_KEY);
    const items = raw ? JSON.parse(raw) : [];
    return Array.isArray(items) ? items : [];
  } catch {
    return [];
  }
}

export function save(items: Line[]) {
  try {
    if (items.length) localStorage.setItem(CART_KEY, JSON.stringify(items));
    else localStorage.removeItem(CART_KEY);
  } catch {}
  window.dispatchEvent(new CustomEvent("cart", { detail: items }));
  return items;
}

export function add(line: Omit<Line, "qty">) {
  const items = load();
  const found = items.find((item) => item.id === line.id);
  if (found) found.qty += 1;
  else items.push({ ...line, qty: 1 });
  return save(items);
}

export const remove = (id: string) => save(load().filter((item) => item.id !== id));

export function setQty(id: string, qty: number) {
  if (qty < 1) return remove(id);
  const items = load();
  const found = items.find((item) => item.id === id);
  if (found) found.qty = qty;
  return save(items);
}

export const clear = () => save([]);

export const count = (items: Line[]) => items.reduce((sum, item) => sum + item.qty, 0);

export const total = (items: Line[]) => items.reduce((sum, item) => sum + Number(item.price) * item.qty, 0).toFixed(2);

export const checkoutUrl = (items: Line[]) => (items.length && SHOP ? `https://${SHOP}/cart/${items.map((item) => `${item.id}:${item.qty}`).join(",")}` : "");

const one = <T extends Element>(selector: string) => document.querySelector<T>(selector);

/* PRODUCT */

function stock() {
  const button = one<HTMLButtonElement>("[data-add]");
  if (!button) return;
  const buy = one<HTMLAnchorElement>("[data-buy]");
  const price = one<HTMLElement>("[data-price]");
  const picked = one<HTMLElement>(".sizes button[aria-pressed='true']");
  if (picked) {
    button.dataset.variant = picked.dataset.variant;
    button.dataset.price = picked.dataset.price;
    button.dataset.size = picked.dataset.size;
  }
  if (price) price.textContent = money(button.dataset.price ?? 0);
  if (buy) buy.href = SHOP ? `https://${SHOP}/cart/${button.dataset.variant}:1` : "/cart/";
}

function pick(button: Element) {
  for (const other of document.querySelectorAll(".sizes button")) other.setAttribute("aria-pressed", String(other === button));
  stock();
}

function shot() {
  const image = one<HTMLImageElement>("[data-stage]") ?? one<HTMLImageElement>("[data-mockups] img");
  return image ? image.currentSrc || image.src : "";
}

function drop(button: HTMLButtonElement) {
  if (button.disabled) return;
  const d = button.dataset;
  add({ id: d.variant ?? "", key: d.key ?? "", title: d.title ?? "", size: d.size ?? "", price: d.price ?? "0", image: shot() });
  button.classList.add("added");
  button.textContent = "Added";
  setTimeout(() => {
    button.classList.remove("added");
    button.textContent = "Add to Bag";
  }, 1500);
}

/* BADGE */

function badge() {
  const n = count(load());
  for (const node of document.querySelectorAll<HTMLElement>("[data-cart-count]")) {
    node.textContent = n ? String(n) : "";
    node.hidden = !n;
  }
}

/* CART PAGE */

const el = <K extends keyof HTMLElementTagNameMap>(tag: K, props: Partial<HTMLElementTagNameMap[K]> & { dataset?: Record<string, string> }) => {
  const node = document.createElement(tag);
  const { dataset, ...rest } = props;
  Object.assign(node, rest);
  if (dataset) Object.assign(node.dataset, dataset);
  return node;
};

function lines() {
  const host = one<HTMLElement>("[data-cart-lines]");
  const sum = one<HTMLElement>("[data-cart-sum]");
  const template = one<HTMLTemplateElement>("#line");
  if (!host || !sum || !template) return;
  const items = load();
  host.replaceChildren();
  sum.replaceChildren();
  sum.classList.toggle("empty", !items.length);
  if (!items.length) {
    sum.append(
      el("span", { className: "icon big", textContent: "shopping_bag" }),
      el("p", { className: "lead", textContent: "Your bag is empty." }),
      el("a", { className: "pill go", href: "/shop/", textContent: "Browse the shop" }),
    );
    return;
  }
  for (const item of items) {
    const node = template.content.cloneNode(true) as DocumentFragment;
    const q = <T extends Element>(s: string) => node.querySelector(s) as T;
    q<HTMLAnchorElement>("[data-href]").href = productUrl(item.key);
    const image = q<HTMLImageElement>("img");
    image.src = item.image;
    image.alt = item.key;
    const title = q<HTMLAnchorElement>("[data-title]");
    title.href = productUrl(item.key);
    title.textContent = `${item.title} (${item.key})`;
    q<HTMLElement>("[data-size]").textContent = `${item.size} · ${money(item.price)}`;
    q<HTMLElement>("[data-qty]").textContent = String(item.qty);
    q<HTMLElement>("[data-total]").textContent = money(Number(item.price) * item.qty);
    for (const [name, qty] of [
      ["[data-dec]", item.qty - 1],
      ["[data-inc]", item.qty + 1],
    ] as const) {
      const button = q<HTMLElement>(name);
      button.dataset.id = item.id;
      button.dataset.qty = String(qty);
    }
    q<HTMLElement>("[data-remove]").dataset.id = item.id;
    host.append(node);
  }
  const n = count(items);
  sum.append(
    el("p", { className: "total", textContent: `${n} item${n === 1 ? "" : "s"} · ${money(total(items))}` }),
    el("a", { className: "pill go", href: checkoutUrl(items), textContent: "Checkout", dataset: { checkout: "" } }),
    el("button", { type: "button", className: "pill", textContent: "Clear bag", dataset: { clear: "" } }),
    el("a", { className: "back", href: "/shop/", textContent: "Continue shopping" }),
  );
}

/* WIRE */

document.addEventListener("click", (event) => {
  const target = event.target instanceof Element ? event.target : null;
  if (!target) return;
  const size = target.closest(".sizes button");
  if (size) return pick(size);
  const drops = target.closest<HTMLButtonElement>("[data-add]");
  if (drops) return drop(drops);
  const step = target.closest<HTMLElement>("[data-dec], [data-inc]");
  if (step) return void setQty(step.dataset.id ?? "", Number(step.dataset.qty));
  const gone = target.closest<HTMLElement>("[data-remove]");
  if (gone) return void remove(gone.dataset.id ?? "");
  if (target.closest("[data-clear]")) clear();
});

window.addEventListener("cart", lines);
window.addEventListener("cart", badge);
window.addEventListener("flip", stock);
window.addEventListener("storage", lines);
window.addEventListener("storage", badge);
stock();
lines();
badge();
