import { cdnUrl, grid, money, type Picture, type Variant } from "../lib/shop.ts";

type Sibling = { design: string; created: string; price: string; variants: Variant[]; images: Picture[]; files: string[]; available: boolean };

const node = document.getElementById("siblings");
const siblings: Record<string, Sibling> = node ? JSON.parse(node.textContent ?? "{}") : {};

const style = (list: Picture[], want: string) => list.find((image) => image.style === want) ?? list[0];

function swap(key: string) {
  const one = siblings[key];
  if (!one) return;
  const add = document.querySelector<HTMLButtonElement>("[data-add]");
  const old = add ? add.dataset.key : "";
  for (const image of document.querySelectorAll<HTMLImageElement>("[data-keys] [data-thumbs] img[data-style]")) {
    const found = style(one.images, image.dataset.style ?? "");
    if (!found) continue;
    image.src = grid(found.url, 400);
    image.dataset.full = grid(found.url, 1200);
    image.dataset.link = grid(found.url, 2000);
    image.dataset.alt = found.alt;
  }
  for (const image of document.querySelectorAll<HTMLImageElement>("[data-grid] img[data-style]")) {
    const found = style(one.images, image.dataset.style ?? "");
    if (!found) continue;
    image.src = grid(found.url, 800);
    image.alt = found.alt;
    const link = image.closest("a");
    if (link) link.href = grid(found.url, 2000);
  }
  for (const image of document.querySelectorAll<HTMLImageElement>("[data-files] img[data-style]")) {
    const n = image.dataset.style?.replace("tile-", "") ?? "";
    image.src = cdnUrl(one.design, `tile-${n}`);
    image.dataset.full = image.src;
    image.dataset.link = image.src;
    image.dataset.alt = `${one.design} ${n}x${n}`;
  }
  const downloads = document.querySelector("[data-downloads]");
  if (downloads) {
    const list: [string, string][] = one.files.map((name): [string, string] => [name, cdnUrl(key, name)]);
    downloads.replaceChildren();
    for (const [name, href] of list) downloads.append(Object.assign(document.createElement("a"), { href, download: "", textContent: name }));
  }
  for (const button of document.querySelectorAll<HTMLElement>(".sizes button")) {
    const variant = one.variants.find((each) => each.size === button.dataset.size);
    button.hidden = !variant;
    if (!variant) continue;
    button.dataset.variant = variant.id;
    button.dataset.price = variant.price;
  }
  if (add) {
    add.dataset.key = key;
    add.dataset.variant = one.variants[0]?.id ?? "";
    add.dataset.price = one.price;
    add.dataset.size = one.variants[0]?.size ?? "";
    add.disabled = !one.available;
  }
  const price = document.querySelector("[data-price]");
  if (price) price.textContent = money(one.price);
  for (const life of document.querySelectorAll<HTMLElement>("[data-born]")) life.dataset.born = one.created;
  for (const tile of document.querySelectorAll<HTMLElement>("[data-siblings] a[data-key]")) {
    if (tile.dataset.key === key) tile.setAttribute("aria-current", "page");
    else tile.removeAttribute("aria-current");
  }
  const fine = document.querySelector("[data-design]");
  if (fine) fine.textContent = `Design ${one.design}`;
  if (old !== key) history.pushState({ key }, "", `/products/${key}/`);
  window.dispatchEvent(new CustomEvent("flip", { detail: key }));
}

if (Object.keys(siblings).length) {
  document.addEventListener("click", (event) => {
    const target = event.target instanceof Element ? event.target.closest<HTMLElement>("[data-siblings] a[data-key]") : null;
    if (!target) return;
    event.preventDefault();
    swap(target.dataset.key ?? "");
  });
  window.addEventListener("popstate", () => {
    const key = location.pathname.split("/").filter(Boolean).pop() ?? "";
    if (siblings[key]) swap(key);
  });
}
