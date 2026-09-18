import { tileUrl } from "../lib/shop.ts";
import { Carousel } from "./Gallery.jsx";
import { Icon } from "./Icon.jsx";

export function Downloads({ product, tiles }) {
  const url = (n) => tileUrl(product.design, product.primary, n);
  const slides = tiles.map((n) => ({ style: `tile-${n}`, thumb: url(n), full: url(n), link: url(n), alt: `${product.design} ${n}x${n}`, name: `${n}x${n}` }));
  return (
    <details className="drop files" data-files>
      <summary>
        <span>Downloads</span>
        <Icon name="expand_more" extra="small" />
      </summary>
      <div className="inside">
        <Carousel slides={slides} pixel download label="Tile" />
        <p className="get">
          <a className="pill go wide" href={url(tiles[0])} download data-download>
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
