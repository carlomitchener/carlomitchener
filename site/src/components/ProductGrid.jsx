import { ProductCard } from "./ProductCard.jsx";

export function ProductGrid({ products, eager = 0, tiles = false, hide, now }) {
  if (!products.length) return <p className="lead empty">Nothing here right now. New variations arrive with every moon.</p>;
  return (
    <div className="grid">
      {products.map((product, i) => (
        <ProductCard key={product.key} product={product} eager={i < eager} tiles={tiles} hidden={hide ? hide(product) : false} now={now} />
      ))}
    </div>
  );
}
