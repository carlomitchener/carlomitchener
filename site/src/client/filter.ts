const host = document.querySelector<HTMLElement>("[data-facets]");
const cards = document.querySelector<HTMLElement>("main [data-cards]");

const KEYS = ["design", "group", "primary", "secondary"] as const;

type Key = (typeof KEYS)[number];

const low = (text: string) => text.trim().toLowerCase();

if (host && cards) {
  const chips = [...host.querySelectorAll<HTMLButtonElement>("[data-facet] [data-value]")];
  const sort = host.querySelector<HTMLSelectElement>("[data-sort]")!;
  const shown = host.querySelector<HTMLElement>("[data-shown]");
  const clear = host.querySelector<HTMLButtonElement>("[data-clear]");
  const none = document.querySelector<HTMLElement>("[data-none]");
  const items = [...cards.querySelectorAll<HTMLElement>("[data-design]")];
  const first = sort.options[0]?.value ?? "newest";
  const picked: Record<Key, Set<string>> = { design: new Set(), group: new Set(), primary: new Set(), secondary: new Set() };

  const rank: Record<string, (a: HTMLElement, b: HTMLElement) => number> = {
    expiring: (a, b) => (a.dataset.created ?? "").localeCompare(b.dataset.created ?? ""),
    low: (a, b) => Number(a.dataset.price) - Number(b.dataset.price),
    high: (a, b) => Number(b.dataset.price) - Number(a.dataset.price),
  };

  const read = () => {
    const params = new URLSearchParams(location.search);
    for (const key of KEYS) picked[key] = new Set((params.get(key) ?? "").split(",").map(low).filter(Boolean));
    const want = params.get("sort") ?? "";
    sort.value = [...sort.options].some((option) => option.value === want) ? want : first;
  };

  const write = () => {
    const params = new URLSearchParams(location.search);
    for (const key of KEYS) {
      const list = [...picked[key]];
      if (list.length) params.set(key, list.join(","));
      else params.delete(key);
    }
    if (sort.value === first) params.delete("sort");
    else params.set("sort", sort.value);
    const query = params.toString();
    history.replaceState(history.state, "", `${location.pathname}${query ? `?${query}` : ""}${location.hash}`);
  };

  const has = (item: HTMLElement, key: Key) => {
    const set = picked[key];
    if (!set.size) return true;
    return (item.dataset[key] ?? "").split(" ").map(low).some((value) => set.has(value));
  };

  const apply = () => {
    let n = 0;
    for (const item of items) {
      const on = KEYS.every((key) => has(item, key));
      item.hidden = !on;
      if (on) n++;
    }
    const by = rank[sort.value];
    cards.append(...(by ? [...items].sort((a, b) => by(a, b) || items.indexOf(a) - items.indexOf(b)) : items));
    for (const chip of chips) {
      const key = chip.closest<HTMLElement>("[data-facet]")!.dataset.facet as Key;
      chip.setAttribute("aria-pressed", String(picked[key].has(low(chip.dataset.value ?? ""))));
    }
    const active = KEYS.some((key) => picked[key].size) || sort.value !== first;
    if (clear) clear.hidden = !active;
    if (shown) shown.textContent = active ? `${n} of ${items.length}` : "";
    if (none) none.hidden = n > 0;
  };

  for (const chip of chips) {
    chip.addEventListener("click", () => {
      const key = chip.closest<HTMLElement>("[data-facet]")!.dataset.facet as Key;
      const value = low(chip.dataset.value ?? "");
      if (picked[key].has(value)) picked[key].delete(value);
      else picked[key].add(value);
      write();
      apply();
    });
  }
  sort.addEventListener("change", () => {
    write();
    apply();
  });
  clear?.addEventListener("click", () => {
    for (const key of KEYS) picked[key].clear();
    sort.value = first;
    write();
    apply();
  });
  window.addEventListener("popstate", () => {
    read();
    apply();
  });
  read();
  apply();
}
