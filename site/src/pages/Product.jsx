import { Breadcrumbs } from "../components/Breadcrumbs.jsx";
import { FullGrid, Gallery, Mockups } from "../components/Gallery.jsx";
import { MoreVariations } from "../components/MoreVariations.jsx";
import { ProductDetails } from "../components/ProductDetails.jsx";
import { ProductGrid } from "../components/ProductGrid.jsx";
import { Strip } from "../components/Strip.jsx";

export function Product({ trail, product, family, matching = [], alike, sizes, buy, printful, shop, tiles, now, review, preview = false }) {
  return (
    <div className="wrap">
      <Breadcrumbs trail={trail} />
      <article className="product" data-primary={product.primary}>
        <div className="left">
          <Gallery product={product} />
          <Mockups product={product} />
        </div>
        <div className="side">
          <ProductDetails product={product} sizes={sizes} buy={buy} printful={printful} shop={shop} tiles={tiles} now={now} review={review} preview={preview} />
          <MoreVariations family={family} current={product.design} title={product.title} shop={shop} />
        </div>
      </article>
      {matching.length ? (
        <section className="alike" aria-labelledby="matching">
          <Strip id="matching" title="Matching Products" href={`/shop/?design=${product.design}`} more={`All ${product.design}`} />
          <ProductGrid products={matching} now={now} />
        </section>
      ) : null}
      {alike.length ? (
        <section className="alike" aria-labelledby="alike">
          <Strip id="alike" title="You May Also Like" href="/shop/" more="All variations" />
          <ProductGrid products={alike} now={now} />
        </section>
      ) : null}
      <FullGrid product={product} />
    </div>
  );
}
