import { tileUrl } from "../lib/shop.ts";
import { Carousel } from "./Gallery.jsx";
import { Icon } from "./Icon.jsx";

export function Downloads({ product, tiles }) {
  const slides = tiles.map((n) => ({ style: `tile-${n}`, thumb: tileUrl(product.key, n), full: tileUrl(product.key, n), link: tileUrl(product.key, n), alt: `${product.key} ${n}x${n}`, name: `${n}x${n}` }));
  return (
    <details className="drop files" data-files>
      <summary>
        <span>Downloads</span>
        <Icon name="expand_more" extra="small" />
      </summary>
      <div className="inside">
        <Carousel slides={slides} pixel download label="Tile" />
        <p className="get">
          <a className="pill go wide" href={tileUrl(product.key, tiles[0])} download data-download>
            <Icon name="download" />
            <span>
              Download <span data-download-name>{`${tiles[0]}x${tiles[0]}`}</span>
            </span>
          </a>
        </p>
      </div>
    </details>
  );
}
