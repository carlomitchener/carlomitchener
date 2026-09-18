import { cdnUrl, grid, money, primaryName, productUrl, type Picture, type Primary, type Variant } from "../lib/shop.ts";

type Sibling = { key: string; created: string; released: string; price: string; variants: Variant[]; images: Picture[]; files: string[]; available: boolean };

type Pair = Record<Primary, Sibling>;

const node = document.getElementById("siblings");
const siblings: Record<string, Pair> = node ? JSON.parse(node.textContent ?? "{}") : {};
const article = document.querySelector<HTMLElement>(".product[data-primary]");
const lastSegment = () => location.pathname.split("/").filter(Boolean).pop() ?? "";
const state = { design: lastSegment(), primary: (article?.dataset.primary === "dark" ? "dark" : "light") as Primary, picked: false };

const style = (list: Picture[], want: string) => list.find((image) => image.style === want) ?? list[0];

function swap(design: string, primary: Primary) {
  const one = siblings[design]?.[primary];
  if (!one) return;
  const moved = design !== state.design;
  state.design = design;
  state.primary = primary;
  if (article) article.dataset.primary = primary;
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
    image.src = cdnUrl(design, `${primary}-tile-${n}`);
    image.dataset.full = image.src;
    image.dataset.link = image.src;
    image.dataset.alt = `${design} ${n}x${n}`;
  }
  const downloads = document.querySelector("[data-downloads]");
  if (downloads) {
    downloads.replaceChildren();
    for (const name of one.files) downloads.append(Object.assign(document.createElement("a"), { href: cdnUrl(one.key, name), download: "", textContent: name }));
  }
  for (const button of document.querySelectorAll<HTMLElement>(".sizes button[data-size]")) {
    const variant = one.variants.find((each) => each.size === button.dataset.size);
    button.hidden = !variant;
    if (!variant) continue;
    button.dataset.variant = variant.id;
    button.dataset.price = variant.price;
  }
  const add = document.querySelector<HTMLButtonElement>("[data-add]");
  if (add) {
    add.dataset.key = one.key;
    add.dataset.title = `${primaryName(primary)} ${add.dataset.name ?? ""}`.trim();
    add.dataset.variant = one.variants[0]?.id ?? "";
    add.dataset.price = one.price;
    add.dataset.size = one.variants[0]?.size ?? "";
    add.disabled = !one.available;
  }
  const price = document.querySelector("[data-price]");
  if (price) price.textContent = money(one.price);
  for (const life of document.querySelectorAll<HTMLElement>(".details [data-born]")) life.dataset.born = one.released;
  for (const tile of document.querySelectorAll<HTMLElement>("[data-siblings] a[data-design]")) {
    if (tile.dataset.design === design) tile.setAttribute("aria-current", "page");
    else tile.removeAttribute("aria-current");
  }
  for (const pill of document.querySelectorAll<HTMLElement>("[data-primaries] button[data-primary]")) pill.setAttribute("aria-pressed", pill.dataset.primary === primary ? "true" : "false");
  const fine = document.querySelector("[data-design]");
  if (fine) fine.textContent = `Design ${design}`;
  if (moved) history.pushState({ design }, "", productUrl(one.key));
  window.dispatchEvent(new CustomEvent("flip", { detail: one.key }));
}

function follow() {
  const mode: Primary = document.documentElement.dataset.mode === "dark" ? "dark" : "light";
  if (!state.picked && mode !== state.primary) swap(state.design, mode);
}

if (Object.keys(siblings).length) {
  document.addEventListener("click", (event) => {
    const target = event.target instanceof Element ? event.target : null;
    const tile = target?.closest<HTMLElement>("[data-siblings] a[data-design]");
    if (tile) {
      event.preventDefault();
      swap(tile.dataset.design ?? "", state.primary);
      return;
    }
    const pill = target?.closest<HTMLElement>("[data-primaries] button[data-primary]");
    if (pill) {
      state.picked = true;
      swap(state.design, pill.dataset.primary === "dark" ? "dark" : "light");
    }
  });
  window.addEventListener("popstate", () => {
    const design = lastSegment();
    if (siblings[design]) swap(design, state.primary);
  });
  window.addEventListener("mode", follow);
  follow();
}
