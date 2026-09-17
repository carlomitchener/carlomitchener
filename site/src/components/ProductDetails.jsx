import { cdnUrl, money } from "../lib/shop.ts";
import { Downloads } from "./Downloads.jsx";
import { Icon } from "./Icon.jsx";
import { Life } from "./Life.jsx";
import { VariantPills } from "./VariantPills.jsx";

function Drop({ name, children }) {
  return (
    <details className="drop">
      <summary>
        <span>{name}</span>
        <Icon name="expand_more" extra="small" />
      </summary>
      <div className="inside">{children}</div>
    </details>
  );
}

export function ProductDetails({ product, sizes, buy, printful, shop, tiles, now }) {
  const first = product.variants[0];
  return (
    <div className="details">
      <h1>{product.title}</h1>
      <p className="fine" data-design>{`Design ${product.design}`}</p>
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
      <Life born={product.created} gate bar now={now} />
      <p className="fine">
        <a href={shop}>{`More ${product.title}`}</a> · <a href={printful} rel="noopener">View on Printful</a>
      </p>
      <Drop name="Size Guide">
        <p className="fine">
          Please use Printful's official size guide on their website. Tap <a href={printful} rel="noopener">View on Printful</a>.
        </p>
      </Drop>
      <Downloads product={product} tiles={tiles} />
      {product.files.length ? (
        <Drop name="Printfiles">
          <p className="fine more" data-downloads>
            {product.files.map((name) => (
              <a key={name} href={cdnUrl(product.key, name)} download>
                {name}
              </a>
            ))}
          </p>
        </Drop>
      ) : null}
    </div>
  );
}
