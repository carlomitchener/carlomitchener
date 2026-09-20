import { Breadcrumbs } from "../components/Breadcrumbs.jsx";
import { Chips } from "../components/Chips.jsx";
import { ProductGrid } from "../components/ProductGrid.jsx";
import { bump, useSearch } from "../lib/hooks.ts";

const SORTS = [
  ["newest", "Newest"],
  ["expiring", "Expiring soon"],
  ["low", "Price low to high"],
  ["high", "Price high to low"],
];

const KEYS = ["design", "group", "secondary"];

const FIRST = SORTS[0][0];

const RANK = {
  expiring: (a, b) => (a.created ?? "").localeCompare(b.created ?? ""),
  low: (a, b) => Number(a.price) - Number(b.price),
  high: (a, b) => Number(b.price) - Number(a.price),
};

const low = (text) => String(text ?? "").trim().toLowerCase();

const words = (product, key) => (key === "secondary" ? product.secondary ?? [] : [product[key] ?? ""]).map(low).filter(Boolean);

function state(search) {
  const params = new URLSearchParams(search);
  const picked = {};
  for (const key of KEYS) picked[key] = new Set((params.get(key) ?? "").split(",").map(low).filter(Boolean));
  const want = params.get("sort") ?? "";
  return { picked, sort: SORTS.some(([value]) => value === want) ? want : FIRST };
}

function write(picked, sort) {
  const params = new URLSearchParams(location.search);
  for (const key of KEYS) {
    const list = [...picked[key]];
    if (list.length) params.set(key, list.join(","));
    else params.delete(key);
  }
  if (sort === FIRST) params.delete("sort");
  else params.set("sort", sort);
  const query = params.toString();
  history.replaceState(history.state, "", `${location.pathname}${query ? `?${query}` : ""}${location.hash}`);
  bump();
}

function Facets({ facets, picked, sort, shown, all }) {
  const active = KEYS.some((key) => picked[key].size) || sort !== FIRST;
  const toggle = (key, value) => {
    const next = new Set(picked[key]);
    if (next.has(value)) next.delete(value);
    else next.add(value);
    write({ ...picked, [key]: next }, sort);
  };
  return (
    <div className="facets">
      {facets.map((facet) => (
        <div key={facet.key} className="facet">
          <span className="fine">{facet.label}</span>
          {facet.values.map((value) => (
            <button key={value.name} type="button" className={facet.key === "design" ? "mono" : undefined} aria-pressed={picked[facet.key].has(low(value.name)) ? "true" : "false"} onClick={() => toggle(facet.key, low(value.name))}>
              <span>{value.name}</span>
              <span className="n">{value.n}</span>
            </button>
          ))}
        </div>
      ))}
      <div className="facet">
        <label className="sort">
          <span className="fine">Sort</span>
          <select value={sort} onChange={(event) => write(picked, event.target.value)}>
            {SORTS.map(([value, name]) => (
              <option key={value} value={value}>
                {name}
              </option>
            ))}
          </select>
        </label>
        <span className="fine">{active ? `${shown} of ${all}` : ""}</span>
        {active ? (
          <button type="button" onClick={() => write({ design: new Set(), group: new Set(), secondary: new Set() }, FIRST)}>
            Clear
          </button>
        ) : null}
      </div>
    </div>
  );
}

export function Shop({ trail, title, lead, chips, current, products, facets = [], tiles = false, now }) {
  const { picked, sort } = state(useSearch());
  const keep = (product) => KEYS.every((key) => !picked[key].size || words(product, key).some((value) => picked[key].has(value)));
  const order = new Map(products.map((product, i) => [product.key, i]));
  const list = RANK[sort] ? [...products].sort((a, b) => RANK[sort](a, b) || order.get(a.key) - order.get(b.key)) : products;
  const shown = list.filter(keep).length;
  return (
    <div className="wrap">
      <Breadcrumbs trail={trail} />
      <div className="page-head">
        <h1>{title}</h1>
        {lead ? <p className="lead">{lead}</p> : null}
      </div>
      {chips.map((group) => (
        <Chips key={group.label} label={group.label} cards={group.cards} current={current} />
      ))}
      {products.length > 1 ? <Facets facets={facets} picked={picked} sort={sort} shown={shown} all={products.length} /> : null}
      <ProductGrid products={list} eager={4} tiles={tiles} hide={(product) => !keep(product)} now={now} />
      {products.length > 1 && !shown ? <p className="lead empty">Nothing matches. Clear a filter.</p> : null}
    </div>
  );
}
