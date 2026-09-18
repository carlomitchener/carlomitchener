import { Breadcrumbs } from "../components/Breadcrumbs.jsx";
import { Chips } from "../components/Chips.jsx";
import { ProductGrid } from "../components/ProductGrid.jsx";

const SORTS = [
  ["newest", "Newest"],
  ["expiring", "Expiring soon"],
  ["low", "Price low to high"],
  ["high", "Price high to low"],
];

function Facets({ facets }) {
  return (
    <div className="facets" data-facets>
      {facets.map((facet) => (
        <div key={facet.key} className="facet" data-facet={facet.key}>
          <span className="fine">{facet.label}</span>
          {facet.values.map((value) => (
            <button key={value.name} type="button" className={facet.key === "design" ? "mono" : undefined} data-value={value.name} aria-pressed="false">
              <span>{value.name}</span>
              <span className="n">{value.n}</span>
            </button>
          ))}
        </div>
      ))}
      <div className="facet">
        <label className="sort">
          <span className="fine">Sort</span>
          <select data-sort>
            {SORTS.map(([value, name]) => (
              <option key={value} value={value}>
                {name}
              </option>
            ))}
          </select>
        </label>
        <span className="fine" data-shown></span>
        <button type="button" data-clear hidden>
          Clear
        </button>
      </div>
    </div>
  );
}

export function Shop({ trail, title, lead, chips, current, products, facets = [], tiles = false, now }) {
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
      {products.length > 1 ? <Facets facets={facets} /> : null}
      <ProductGrid products={products} eager={4} tiles={tiles} now={now} />
      {products.length > 1 ? (
        <p className="lead empty" data-none hidden>
          Nothing matches. Clear a filter.
        </p>
      ) : null}
    </div>
  );
}
