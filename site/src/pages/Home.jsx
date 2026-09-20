import { FEED_ROUTE } from "../lib/feed.ts";
import { DesignCard, DesignGrid } from "./Designs.jsx";
import { Life } from "../components/Life.jsx";
import { PostGrid } from "../components/PostGrid.jsx";
import { ProductCard } from "../components/ProductCard.jsx";
import { ProductGrid } from "../components/ProductGrid.jsx";
import { Strip } from "../components/Strip.jsx";

export function Home({ posts, designs = [], sections, fresh = null, now }) {
  return (
    <>
      {fresh ? (
        <section className="wrap home-row" aria-labelledby="fresh">
          <Strip id="fresh" title="Just Generated" href={`/shop/?design=${fresh.design}`} more={`All ${fresh.count} products`}>
            <Life born={fresh.released} now={now} />
          </Strip>
          <div className="grid" data-cards>
            <DesignCard design={fresh} life={false} now={now} />
            {fresh.products.map((product, i) => (
              <ProductCard key={product.key} product={product} eager={i < 3} life={false} now={now} />
            ))}
          </div>
        </section>
      ) : null}
      {posts.length ? (
        <section className="wrap home-row" aria-labelledby="feed">
          <Strip id="feed" title="Feed" href={FEED_ROUTE} more="All posts" />
          <PostGrid posts={posts} now={now} />
        </section>
      ) : null}
      {designs.length ? (
        <section className="wrap home-row" aria-labelledby="designs">
          <Strip id="designs" title="Designs" href="/shop/designs/" more="All designs" />
          <DesignGrid designs={designs} now={now} />
        </section>
      ) : null}
      {sections.map((one) => (
        <section key={one.slug} className="wrap home-row" aria-labelledby={one.slug}>
          <Strip id={one.slug} title={one.name} href={`/shop/${one.slug}/`} more={`All ${one.name}`} />
          <ProductGrid products={one.products} now={now} />
        </section>
      ))}
    </>
  );
}
