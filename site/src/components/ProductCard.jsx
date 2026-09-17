import { grid, money, tileUrl } from "../lib/shop.ts";
import { Life } from "./Life.jsx";

export function ProductCard({ product, width = 800, eager = false, now }) {
  const image = product.images[0];
  return (
    <a className="card" href={`/products/${product.key}/`}>
      <span className="shot">
        {image ? (
          <img src={grid(image.url, width)} alt={image.alt || product.title} width={width} height={width} loading={eager ? "eager" : "lazy"} decoding="async" />
        ) : (
          <img className="tile" src={tileUrl(product.design, 3)} alt={product.title} width="88" height="88" loading="lazy" decoding="async" />
        )}
      </span>
      <h3>{product.title}</h3>
      <span className="price">
        {money(product.price)} · <Life born={product.created} now={now} />
      </span>
    </a>
  );
}
