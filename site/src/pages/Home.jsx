import { SHOP } from "../config/shop.ts";
import { DesignCard, DesignGrid } from "./Designs.jsx";
import { Life } from "../components/Life.jsx";
import { ProductCard } from "../components/ProductCard.jsx";
import { ProductGrid } from "../components/ProductGrid.jsx";
import { Strip } from "../components/Strip.jsx";

export function Home({ designs = [], sections, fresh = null, now }) {
  return (
    <>
      {fresh ? (
        <section className="wrap home-row" aria-labelledby="fresh">
          <Strip id="fresh" title="Just Generated" href={`${SHOP}?design=${fresh.design}`} more={`All ${fresh.count} products`}>
            <Life born={fresh.released} now={now} />
          </Strip>
          <div className="grid">
            <DesignCard design={fresh} life={false} now={now} />
            {fresh.products.map((product, i) => (
              <ProductCard key={product.key} product={product} eager={i < 3} life={false} now={now} />
            ))}
          </div>
        </section>
      ) : null}
      {designs.length ? (
        <section className="wrap home-row" aria-labelledby="designs">
          <Strip id="designs" title="Designs" href={`${SHOP}designs/`} more="All designs" />
          <DesignGrid designs={designs} now={now} />
        </section>
      ) : null}
      {sections.map((one) => (
        <section key={one.slug} className="wrap home-row" aria-labelledby={one.slug}>
          <Strip id={one.slug} title={one.name} href={`${SHOP}${one.slug}/`} more={`All ${one.name}`} />
          <ProductGrid products={one.products} now={now} />
        </section>
      ))}
    </>
  );
}
