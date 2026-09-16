const header = document.querySelector<HTMLElement>("[data-header]");

const HOVER = 180;
const LEAVE = 220;
const LIMIT = 12;

type Hit = { name: string; href: string; kind: string };

if (header) {
  const flyout = header.querySelector<HTMLElement>("[data-flyout]")!;
  const panes = [...header.querySelectorAll<HTMLElement>("[data-pane]")];
  const links = [...header.querySelectorAll<HTMLAnchorElement>("[data-menu]")];
  const burger = header.querySelector<HTMLButtonElement>("[data-burger]")!;
  const search = header.querySelector<HTMLButtonElement>("[data-search]")!;
  const query = header.querySelector<HTMLInputElement>("[data-query]")!;
  const form = header.querySelector<HTMLFormElement>("[data-form]")!;
  const quick = header.querySelector<HTMLElement>("[data-quick]")!;
  const quickTitle = header.querySelector<HTMLElement>("[data-quick-title]")!;
  const results = header.querySelector<HTMLElement>("[data-results]")!;
  const wide = matchMedia("(min-width: 768px)");
  let open = "";
  let timer = 0;
  let index: Hit[] | null = null;

  const show = (name: string) => {
    clearTimeout(timer);
    open = name;
    for (const pane of panes) pane.hidden = pane.dataset.pane !== name;
    for (const link of links) link.classList.toggle("lit", link.dataset.menu === name);
    header.dataset.open = name;
    burger.setAttribute("aria-expanded", String(name === "menu"));
    document.documentElement.classList.toggle("held", !wide.matches);
    if (name === "search") query.focus();
  };

  const hide = () => {
    clearTimeout(timer);
    open = "";
    for (const pane of panes) pane.hidden = true;
    for (const link of links) link.classList.remove("lit");
    delete header.dataset.open;
    burger.setAttribute("aria-expanded", "false");
    document.documentElement.classList.remove("held");
  };

  const later = (name: string, wait: number) => {
    clearTimeout(timer);
    timer = window.setTimeout(() => (name ? show(name) : hide()), wait);
  };

  for (const link of links) {
    link.addEventListener("mouseenter", () => {
      if (!wide.matches) return;
      later(link.dataset.menu!, open ? 0 : HOVER);
    });
    link.addEventListener("focus", () => wide.matches && show(link.dataset.menu!));
  }
  header.addEventListener("mouseleave", () => {
    if (open && open !== "search" && open !== "menu") later("", LEAVE);
  });
  flyout.addEventListener("mouseenter", () => clearTimeout(timer));
  header.querySelector(".links")!.addEventListener("mouseleave", () => {
    if (open && open !== "search" && open !== "menu") later("", LEAVE);
  });

  burger.addEventListener("click", () => (open === "menu" ? hide() : show("menu")));
  search.addEventListener("click", () => (open === "search" ? hide() : show("search")));
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && open) hide();
  });
  document.addEventListener("click", (event) => {
    if (open && event.target instanceof Element && !header.contains(event.target)) hide();
  });
  wide.addEventListener("change", hide);

  /* SEARCH */

  const load = async () => {
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
      ...hits.map((hit) => {
        const li = document.createElement("li");
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
    const hits = (await load()).filter((hit) => words.every((word) => `${hit.name} ${hit.kind}`.toLowerCase().includes(word))).slice(0, LIMIT);
    render(hits);
    if (!hits.length) results.innerHTML = '<li class="none">No results.</li>';
  };

  query.addEventListener("input", find);
  search.addEventListener("mouseenter", load, { once: true });
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const first = results.querySelector<HTMLAnchorElement>("a");
    if (first && !results.hidden) location.href = first.href;
  });
}
