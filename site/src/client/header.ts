import { checkoutUrl, count, load, total } from "./cart.ts";
import { money, productUrl } from "../lib/shop.ts";

const header = document.querySelector<HTMLElement>("[data-header]");

const HOVER = 180;
const LEAVE = 260;
const LIMIT = 12;

type Hit = { name: string; href: string; kind: string };

if (header) {
  const flyout = header.querySelector<HTMLElement>("[data-flyout]")!;
  const panes = [...header.querySelectorAll<HTMLElement>("[data-pane]")];
  const links = [...header.querySelectorAll<HTMLAnchorElement>("[data-menu]")];
  const burger = header.querySelector<HTMLButtonElement>("[data-burger]")!;
  const back = header.querySelector<HTMLButtonElement>("[data-back]")!;
  const search = header.querySelector<HTMLButtonElement>("[data-search]")!;
  const bag = header.querySelector<HTMLAnchorElement>("[data-bag]")!;
  const query = header.querySelector<HTMLInputElement>("[data-query]")!;
  const form = header.querySelector<HTMLFormElement>("[data-form]")!;
  const quick = header.querySelector<HTMLElement>("[data-quick]")!;
  const quickTitle = header.querySelector<HTMLElement>("[data-quick-title]")!;
  const results = header.querySelector<HTMLElement>("[data-results]")!;
  const wide = matchMedia("(min-width: 768px)");
  let open = "";
  let timer = 0;
  let index: Hit[] | null = null;

  const show = (name: string, level = 1) => {
    clearTimeout(timer);
    open = name;
    for (const pane of panes) pane.hidden = pane.dataset.pane !== name;
    for (const link of links) link.classList.toggle("lit", link.dataset.menu === name);
    header.dataset.open = name;
    header.dataset.level = String(level);
    burger.setAttribute("aria-expanded", String(!wide.matches));
    document.documentElement.classList.toggle("held", !wide.matches);
    if (name === "search") query.focus();
    if (name === "bag") purse();
  };

  const hide = () => {
    clearTimeout(timer);
    open = "";
    for (const pane of panes) pane.hidden = true;
    for (const link of links) link.classList.remove("lit");
    delete header.dataset.open;
    delete header.dataset.level;
    burger.setAttribute("aria-expanded", "false");
    document.documentElement.classList.remove("held");
  };

  const later = (name: string, wait: number) => {
    clearTimeout(timer);
    timer = window.setTimeout(() => (name ? show(name) : hide()), wait);
  };

  const sticky = () => open === "search" || (open && !wide.matches);

  /* DESKTOP */

  for (const link of links) {
    link.addEventListener("mouseenter", () => wide.matches && later(link.dataset.menu!, open ? 0 : HOVER));
    link.addEventListener("focus", () => wide.matches && show(link.dataset.menu!));
  }
  bag.addEventListener("mouseenter", () => wide.matches && later("bag", open ? 0 : HOVER));
  for (const away of [header.querySelector(".home")!, search]) away.addEventListener("mouseenter", () => !sticky() && later("", LEAVE));
  header.addEventListener("mouseleave", () => !sticky() && later("", LEAVE));
  flyout.addEventListener("mouseenter", () => clearTimeout(timer));

  /* PHONE */

  burger.addEventListener("click", () => (open ? hide() : show("menu")));
  back.addEventListener("click", () => show("menu"));
  header.addEventListener("click", (event) => {
    const sub = event.target instanceof Element ? event.target.closest<HTMLElement>("[data-sub]") : null;
    if (sub) show(sub.dataset.sub!, 2);
  });

  /* BOTH */

  search.addEventListener("click", () => (open === "search" ? hide() : show("search")));
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && open) hide();
  });
  document.addEventListener("click", (event) => {
    if (open && event.target instanceof Element && !header.contains(event.target)) hide();
  });
  wide.addEventListener("change", hide);

  /* BAG */

  function purse() {
    const items = load();
    const lines = header!.querySelector<HTMLElement>("[data-bag-lines]")!;
    const empty = header!.querySelector<HTMLElement>("[data-bag-empty]")!;
    const checkout = header!.querySelector<HTMLAnchorElement>("[data-checkout]")!;
    const title = header!.querySelector<HTMLElement>("[data-bag-title]")!;
    lines.replaceChildren(
      ...items.map((item) => {
        const li = document.createElement("li");
        const a = document.createElement("a");
        a.href = productUrl(item.key);
        const img = document.createElement("img");
        img.src = item.image;
        img.alt = item.key;
        img.width = 48;
        img.height = 48;
        const text = document.createElement("span");
        text.textContent = item.title;
        const fine = document.createElement("small");
        fine.textContent = `${item.size} · ${money(item.price)}${item.qty > 1 ? ` × ${item.qty}` : ""}`;
        a.append(img, text, fine);
        li.append(a);
        return li;
      }),
    );
    empty.hidden = items.length > 0;
    const n = count(items);
    title.textContent = n ? `Your Bag · ${n} item${n === 1 ? "" : "s"} · ${money(total(items))}` : "Your Bag";
    checkout.hidden = !items.length;
    checkout.href = checkoutUrl(items) || "/cart/";
  }
  window.addEventListener("cart", () => open === "bag" && purse());

  /* SEARCH */

  const fetchIndex = async () => {
    if (index) return index;
    try {
      index = (await (await fetch("/search.json")).json()) as Hit[];
    } catch {
      index = [];
    }
    return index;
  };

  const render = (hits: Hit[]) => {
    results.replaceChildren(
      ...hits.map((hit, i) => {
        const li = document.createElement("li");
        li.style.setProperty("--i", String(i));
        const a = document.createElement("a");
        a.href = hit.href;
        const icon = document.createElement("span");
        icon.className = "icon small";
        icon.setAttribute("aria-hidden", "true");
        icon.textContent = "arrow_forward";
        const kind = document.createElement("small");
        kind.textContent = hit.kind;
        a.append(icon, hit.name, kind);
        li.append(a);
        return li;
      }),
    );
  };

  const find = async () => {
    const text = query.value.trim().toLowerCase();
    const empty = !text;
    quick.hidden = !empty;
    quickTitle.hidden = !empty;
    results.hidden = empty;
    if (empty) return;
    const words = text.split(/\s+/);
    const hits = (await fetchIndex()).filter((hit) => words.every((word) => `${hit.name} ${hit.kind}`.toLowerCase().includes(word))).slice(0, LIMIT);
    render(hits);
    if (!hits.length) results.innerHTML = '<li class="none">No results.</li>';
  };

  query.addEventListener("input", find);
  search.addEventListener("mouseenter", fetchIndex, { once: true });
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const first = results.querySelector<HTMLAnchorElement>("a");
    if (first && !results.hidden) location.href = first.href;
  });
}
