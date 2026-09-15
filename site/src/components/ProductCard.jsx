import { grid, money, tileUrl } from "../lib/shop.ts";
import { Moon } from "./Moon.jsx";

export function ProductCard({ product, width = 800, eager = false, now }) {
  const image = product.images[0];
  return (
    <a className="card" href={`/products/${product.key}/`}>
      <span className="shot">
        {image ? (
          <img src={grid(image.url, width)} alt={image.alt || product.title} width={width} height={width} loading={eager ? "eager" : "lazy"} decoding="async" />
        ) : (
          <img className="tile" src={tileUrl(product.key, 3)} alt={product.title} width="88" height="88" loading="lazy" decoding="async" />
        )}
      </span>
      <h3>{product.title}</h3>
      <span className="who">
        <span className="price">{money(product.price)}</span>
        <Moon born={product.created} now={now} />
      </span>
    </a>
  );
}
