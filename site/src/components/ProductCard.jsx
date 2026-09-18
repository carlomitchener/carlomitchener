import { MORE_TILE } from "../config/shop.ts";
import { grid, money, PRIMARIES, productUrl, tileUrl } from "../lib/shop.ts";
import { Life } from "./Life.jsx";

function Shot({ product, primary, width, eager, tiles }) {
  const image = product[primary].images[0];
  const loading = eager && primary === "light" ? "eager" : "lazy";
  if (tiles) return <img className={`pixel ${primary}`} src={tileUrl(product.design, primary, MORE_TILE)} alt={`${product.title} ${product.design}`} width="270" height="270" loading={loading} decoding="async" />;
  if (image) return <img className={primary} src={grid(image.url, width)} alt={image.alt || product.title} width={width} height={width} loading={loading} decoding="async" />;
  return <img className={`tile ${primary}`} src={tileUrl(product.design, primary, 3)} alt={product.title} width="88" height="88" loading="lazy" decoding="async" />;
}

export function ProductCard({ product, width = 800, eager = false, tiles = false, now }) {
  return (
    <a className="card" href={productUrl(product.key)} data-design={product.design} data-group={product.group || undefined} data-secondary={product.secondary?.length ? product.secondary.join(" ") : undefined} data-created={product.created} data-price={product.price}>
      <span className="shot">
        {PRIMARIES.map((primary) => (
          <Shot key={primary} product={product} primary={primary} width={width} eager={eager} tiles={tiles} />
        ))}
      </span>
      <h3 className={tiles ? "mono" : undefined}>{tiles ? product.design : product.title}</h3>
      <span className="price">
        {money(product.price)} · {product.released ? <Life born={product.released} now={now} /> : "in the batch"}
      </span>
    </a>
  );
}
