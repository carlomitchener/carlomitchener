import { Breadcrumbs } from "../components/Breadcrumbs.jsx";
import { FullGrid, Gallery, Mockups } from "../components/Gallery.jsx";
import { MoreVariations } from "../components/MoreVariations.jsx";
import { ProductDetails } from "../components/ProductDetails.jsx";
import { ProductGrid } from "../components/ProductGrid.jsx";
import { Siblings } from "../components/Siblings.jsx";

export function Product({ trail, product, family, alike, sizes, buy, printful, shop, tiles, now }) {
  return (
    <div className="wrap">
      <Breadcrumbs trail={trail} />
      <article className="product">
        <div className="left">
          <Gallery product={product} />
          <Mockups product={product} />
        </div>
        <div className="side">
          <ProductDetails product={product} sizes={sizes} buy={buy} printful={printful} shop={shop} tiles={tiles} now={now} />
          <MoreVariations family={family} current={product.key} title={product.title} shop={shop} />
        </div>
      </article>
      <Siblings family={family} current={product.key} />
      {alike.length ? (
        <section className="alike" aria-labelledby="alike">
          <h2 id="alike">You May Also Like</h2>
          <ProductGrid products={alike} now={now} />
        </section>
      ) : null}
      <FullGrid product={product} />
    </div>
  );
}
