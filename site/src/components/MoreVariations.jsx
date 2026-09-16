import { MORE_TILE } from "../config/shop.ts";
import { tileUrl } from "../lib/shop.ts";

export function MoreVariations({ family, current, title, shop }) {
  const others = family.filter((one) => one.key !== current);
  if (!others.length) return null;
  return (
    <section className="variations" aria-labelledby="variations">
      <h2 id="variations" className="fine">
        <a href={shop}>{`More Variations of ${title}`}</a>
      </h2>
      <div className="tiles">
        {others.map((one) => (
          <a key={one.key} href={`/products/${one.key}/`} aria-label={`${title} ${one.key}`}>
            <img src={tileUrl(one.key, MORE_TILE)} alt="" width="88" height="88" loading="lazy" decoding="async" />
          </a>
        ))}
      </div>
    </section>
  );
}
