import { Breadcrumbs } from "../components/Breadcrumbs.jsx";
import { Chips } from "../components/Chips.jsx";
import { ProductGrid } from "../components/ProductGrid.jsx";

export function Shop({ trail, title, lead, chips, current, products, now }) {
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
      <ProductGrid products={products} eager={4} now={now} />
    </div>
  );
}
