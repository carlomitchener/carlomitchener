import { MORE_TILE } from "../config/shop.ts";
import { grid, money, productUrl, tileUrl } from "../lib/shop.ts";
import { Life } from "./Life.jsx";

export function ProductCard({ product, width = 800, eager = false, tiles = false, now }) {
  const image = product.images[0];
  return (
    <a className="card" href={productUrl(product.key)}>
      <span className="shot">
        {tiles ? (
          <img className="pixel" src={tileUrl(product.design, MORE_TILE)} alt={`${product.title} ${product.design}`} width="270" height="270" loading={eager ? "eager" : "lazy"} decoding="async" />
        ) : image ? (
          <img src={grid(image.url, width)} alt={image.alt || product.title} width={width} height={width} loading={eager ? "eager" : "lazy"} decoding="async" />
        ) : (
          <img className="tile" src={tileUrl(product.design, 3)} alt={product.title} width="88" height="88" loading="lazy" decoding="async" />
        )}
      </span>
      <h3 className={tiles ? "mono" : undefined}>{tiles ? product.design : product.title}</h3>
      <span className="price">
        {money(product.price)} · <Life born={product.created} now={now} />
      </span>
    </a>
  );
}
