import { HELP, LIVE_DAYS } from "../config/shop.ts";
import { cdnUrl, money, primaryName } from "../lib/shop.ts";
import { Downloads } from "./Downloads.jsx";
import { Icon } from "./Icon.jsx";
import { Life } from "./Life.jsx";
import { PrimaryPills } from "./PrimaryPills.jsx";
import { Reviews } from "./Reviews.jsx";
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

export function ProductDetails({ product, sizes, buy, printful, shop, tiles, now, review, preview = false }) {
  const first = product.variants[0];
  return (
    <div className="details">
      <h1>{product.title}</h1>
      <p className="fine" data-design>{`Design ${product.design}`}</p>
      <p className="price" data-price>
        {money(product.price)}
      </p>
      <PrimaryPills picked={product.primary} />
      <VariantPills sizes={sizes} picked={product.variant} />
      <div className="buy">
        <button
          className="pill go wide"
          type="button"
          data-add
          data-key={product.key}
          data-name={product.title}
          data-title={`${primaryName(product.primary)} ${product.title}`}
          data-variant={product.variant}
          data-price={product.price}
          data-size={first ? first.size : ""}
          disabled={preview || !product.available}
        >
          Add to Bag
        </button>
        <a className="pill wide" href={preview ? undefined : buy} aria-disabled={preview ? "true" : undefined} data-buy rel="noopener">
          Buy now
        </a>
      </div>
      {preview ? <p className="fine pending">{`In batch ${product.design}, not released. The whole batch goes on sale at once.`}</p> : <Life born={product.released} gate bar now={now} />}
      <p className="fine">
        <a href={shop}>{`More ${product.title}`}</a>
      </p>
      <Drop name="Size Guide">
        <p className="fine">
          Please use Printful's official size guide on their website. Tap <a href={printful} rel="noopener">View on Printful</a>.
        </p>
      </Drop>
      <Drop name="Shipping">
        <p className="fine">Manufacturing takes 2 to 5 working days. Shipping takes 5 to 10 working days. Bags always ship separately.</p>
        <p className="fine">
          Printful prints and ships every order. See their <a href={HELP.delivery} rel="noopener">delivery times</a>, <a href={HELP.shipping} rel="noopener">shipping rates</a>, the <a href={HELP.countries} rel="noopener">countries they do not ship to</a>, <a href={HELP.customs} rel="noopener">who pays customs</a> and <a href={HELP.updates} rel="noopener">current delays</a>.
        </p>
      </Drop>
      <Drop name="Disclaimers">
        <p className="fine">Printful cannot guarantee perfect placement of designs. The product you receive may look a little different from the mockups. Seams cut through the pattern and can show thin white lines.</p>
        <p className="fine">Designs are printed on white polyester by sublimation. The inside of a garment stays white. Colours on fabric differ slightly from colours on a screen.</p>
        <p className="fine">
          Read Printful's <a href={HELP.disclaimers} rel="noopener">printing disclaimers</a> and <a href={HELP.aop} rel="noopener">how all-over printing works</a>.
        </p>
      </Drop>
      <Reviews review={review} printful={printful} />
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
      <Drop name="Expiration">
        <p className="fine">
          {`Every product here lives one lunar month, ${LIVE_DAYS} days from the day its batch went live. When its moon has passed, the reaper deletes the whole batch: the products, their printfiles and the design's tiles, and nobody prints it again. The countdown above is the truth. Two days means two days.`}
        </p>
      </Drop>
      <a className="pill wide" href={printful} rel="noopener">
        <Icon name="open_in_new" />
        <span>View on Printful</span>
      </a>
    </div>
  );
}
