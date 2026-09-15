import { money, tileUrl } from "../lib/shop.ts";

export function Siblings({ family, current }) {
  if (family.length < 2) return null;
  return (
    <section className="also" aria-labelledby="designs">
      <h2 id="designs">Also in this design</h2>
      <div className="siblings" data-siblings>
        {family.map((one) => (
          <a key={one.key} href={`/products/${one.key}/`} aria-current={one.key === current ? "page" : undefined} data-key={one.key}>
            <img src={tileUrl(one.key, 3)} alt={one.key} width="88" height="88" loading="lazy" decoding="async" />
            <span className="price">{money(one.price)}</span>
          </a>
        ))}
      </div>
    </section>
  );
}
