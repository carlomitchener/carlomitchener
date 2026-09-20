import { useState } from "react";
import { tileUrl } from "../lib/shop.ts";
import { Carousel } from "./Gallery.jsx";
import { Icon } from "./Icon.jsx";

export function Downloads({ design, primary, tiles }) {
  const [index, setIndex] = useState(0);
  const url = (n) => tileUrl(design, primary, n);
  const slides = tiles.map((n) => ({ style: `tile-${n}`, thumb: url(n), full: url(n), link: url(n), alt: `${design} ${n}x${n}`, name: `${n}x${n}` }));
  const one = slides[index] ?? slides[0];
  return (
    <details className="drop files">
      <summary>
        <span>Downloads</span>
        <Icon name="expand_more" extra="small" />
      </summary>
      <div className="inside">
        <Carousel slides={slides} index={index} onIndex={setIndex} pixel label="Tile" />
        <p className="get">
          <a className="pill go wide" href={one.link} download>
            <Icon name="download" />
            <span>
              Download <span>{one.name}</span>
            </span>
          </a>
        </p>
      </div>
    </details>
  );
}
