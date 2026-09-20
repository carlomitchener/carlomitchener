import { MORE_TILE } from "../config/shop.ts";
import { PRIMARIES, tileUrl } from "../lib/shop.ts";

export function MoreVariations({ family, current, title, shop }) {
  if (family.length < 2) return null;
  return (
    <section className="variations" aria-labelledby="variations">
      <h2 id="variations" className="fine">
        <a href={shop}>{`More Variations of ${title}`}</a>
      </h2>
      <div className="tiles">
        {family.map((one) => (
          <a key={one.design} href={one.href} aria-label={`${title} ${one.design}`} aria-current={one.design === current ? "page" : undefined} data-stay>
            {PRIMARIES.map((primary) => (
              <img key={primary} className={primary} src={tileUrl(one.design, primary, MORE_TILE)} alt="" width="88" height="88" loading="lazy" decoding="async" />
            ))}
          </a>
        ))}
      </div>
    </section>
  );
}
