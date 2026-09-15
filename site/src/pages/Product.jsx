import { Breadcrumbs } from "../components/Breadcrumbs.jsx";
import { FullGrid, Gallery, Mockups } from "../components/Gallery.jsx";
import { ProductDetails } from "../components/ProductDetails.jsx";
import { Siblings } from "../components/Siblings.jsx";

export function Product({ trail, product, family, sizes, buy, printful, shop, tiles, now }) {
  return (
    <div className="wrap">
      <Breadcrumbs trail={trail} />
      <article className="product">
        <div className="left">
          <Gallery product={product} />
          <Mockups product={product} />
        </div>
        <ProductDetails product={product} sizes={sizes} buy={buy} printful={printful} shop={shop} tiles={tiles} now={now} />
        <Siblings family={family} current={product.key} />
      </article>
      <FullGrid product={product} />
    </div>
  );
}
