import { Breadcrumbs } from "../components/Breadcrumbs.jsx";
import { Life } from "../components/Life.jsx";
import { MORE_TILE } from "../config/shop.ts";
import { tileUrl } from "../lib/shop.ts";

export function DesignGrid({ designs, now }) {
  return (
    <div className="grid designs">
      {designs.map((one) => (
        <a key={one.design} className="card" href={`/shop/?design=${one.design}`}>
          <span className="shot">
            <img className="pixel" src={tileUrl(one.design, MORE_TILE)} alt={one.design} width="270" height="270" loading="lazy" decoding="async" />
          </span>
          <h3 className="mono">{one.design}</h3>
          <span className="price">
            {one.count} {one.count === 1 ? "product" : "products"} · <Life born={one.created} now={now} />
          </span>
        </a>
      ))}
    </div>
  );
}

export function Designs({ trail, title, lead, designs, now }) {
  return (
    <div className="wrap">
      <Breadcrumbs trail={trail} />
      <div className="page-head">
        <h1>{title}</h1>
        {lead ? <p className="lead">{lead}</p> : null}
      </div>
      <DesignGrid designs={designs} now={now} />
    </div>
  );
}
