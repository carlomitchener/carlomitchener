import { Breadcrumbs } from "../components/Breadcrumbs.jsx";
import { Life } from "../components/Life.jsx";
import { MORE_TILE, SHOP } from "../config/shop.ts";
import { PRIMARIES, tileUrl } from "../lib/shop.ts";

export function DesignCard({ design, life = true, now }) {
  return (
    <a className="card" href={`${SHOP}?design=${design.design}`}>
      <span className="shot">
        {PRIMARIES.map((primary) => (
          <img key={primary} className={`pixel ${primary}`} src={tileUrl(design.design, primary, MORE_TILE)} alt={design.design} width="270" height="270" loading="lazy" decoding="async" />
        ))}
      </span>
      <h3 className="mono">{design.design}</h3>
      <span className="price">
        {design.count} {design.count === 1 ? "product" : "products"}
        {life ? <> · <Life born={design.released} now={now} /></> : null}
      </span>
    </a>
  );
}

export function DesignGrid({ designs, now }) {
  return (
    <div className="grid designs">
      {designs.map((one) => (
        <DesignCard key={one.design} design={one} now={now} />
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
