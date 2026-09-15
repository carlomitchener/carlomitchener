import { money } from "../lib/shop.ts";
import { Downloads } from "./Downloads.jsx";
import { Moon } from "./Moon.jsx";
import { VariantPills } from "./VariantPills.jsx";

export function ProductDetails({ product, sizes, buy, printful, shop, tiles, now }) {
  const first = product.variants[0];
  return (
    <div className="side">
      <h1>{product.title}</h1>
      <p className="fine" data-design>{`Design ${product.key}`}</p>
      <p className="price" data-price>
        {money(product.price)}
      </p>
      <VariantPills sizes={sizes} picked={product.variant} />
      <div className="buy">
        <button
          className="pill go wide"
          type="button"
          data-add
          data-key={product.key}
          data-title={product.title}
          data-variant={product.variant}
          data-price={product.price}
          data-size={first ? first.size : ""}
          disabled={!product.available}
        >
          Add to Bag
        </button>
        <a className="pill wide" href={buy} data-buy rel="noopener">
          Buy now
        </a>
      </div>
      <p className="fine life">
        <Moon born={product.created} gate now={now} />
        <span>left on this moon</span>
      </p>
      <p className="fine">
        <a href={shop}>{`More ${product.title}`}</a> · <a href={printful} rel="noopener">View on Printful</a>
      </p>
      <Downloads product={product} tiles={tiles} />
    </div>
  );
}
