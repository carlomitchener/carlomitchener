import { GIFT, giftUrl, money } from "../lib/shop.ts";
import { Breadcrumbs } from "../components/Breadcrumbs.jsx";

export const TIERS = [
  { tier: "mini", name: "Mini", tint: "--red", from: 11, to: 99 },
  { tier: "medi", name: "Medi", tint: "--green", from: 111, to: 999 },
  { tier: "maxi", name: "Maxi", tint: "--blue", from: 1111, to: 9999 },
];

const whole = (price) => String(Math.round(Number(price)));

function Face({ card, amount, stage = false }) {
  return (
    <figure className="face" style={{ "--tint": `var(${card.tint})` }}>
      <div className="face-top">
        <img src="/bird/bird-128.png" alt="" width="28" height="28" data-stage={stage ? "" : undefined} />
        <span>carlomitchener.com</span>
      </div>
      <p className="face-amount mono" data-face={stage ? "" : undefined}>
        {amount}
      </p>
      <div className="face-foot">
        <span>Gift Card</span>
        <span>{card.name}</span>
      </div>
    </figure>
  );
}

export function GiftCards({ cards }) {
  return (
    <div className="wrap">
      <Breadcrumbs trail={[{ name: "Gift Card" }]} />
      <div className="page-head">
        <h1>Gift Card</h1>
        <p className="lead">Three sizes, nine angel numbers each. Sent by email, never expires.</p>
      </div>
      <div className="gift-row">
        {cards.map((card) => (
          <a key={card.tier} className="gift-pick" href={giftUrl(card.tier)}>
            <Face card={card} amount={String(card.from)} />
            <h3>{`${card.name} Gift Card`}</h3>
            <span className="price">{`$${card.from} to $${card.to}`}</span>
          </a>
        ))}
      </div>
    </div>
  );
}

export function GiftCard({ card, cards, product, buy }) {
  const first = product.variants[0];
  return (
    <div className="wrap">
      <Breadcrumbs trail={[{ name: "Gift Card", href: GIFT }, { name: card.name }]} />
      <article className="gift">
        <div className="left">
          <Face card={card} amount={whole(first.price)} stage />
        </div>
        <div className="side">
          <div className="details">
            <h1>{`${card.name} Gift Card`}</h1>
            <p className="fine">{`Angel numbers from ${card.from} to ${card.to}.`}</p>
            <p className="price" data-price>
              {money(first.price)}
            </p>
            <nav className="tiers" aria-label="Gift card size">
              {cards.map((one) => (
                <a key={one.tier} href={giftUrl(one.tier)} aria-current={one.tier === card.tier ? "page" : undefined}>
                  {one.name}
                </a>
              ))}
            </nav>
            <div className="sizes" role="group" aria-label="Amount">
              {product.variants.map((variant, i) => (
                <button type="button" key={variant.id} className="mono" data-variant={variant.id} data-price={variant.price} data-size={`$${whole(variant.price)}`} aria-pressed={i === 0 ? "true" : "false"} disabled={!variant.available}>
                  {whole(variant.price)}
                </button>
              ))}
            </div>
            <div className="buy">
              <button className="pill go wide" type="button" data-add data-key={product.key} data-title={`${card.name} Gift Card`} data-variant={first.id} data-price={first.price} data-size={`$${whole(first.price)}`} disabled={!product.available}>
                Add to Bag
              </button>
              <a className="pill wide" href={buy} data-buy rel="noopener">
                Buy now
              </a>
            </div>
            <p className="fine">Shopify emails the code after checkout. It buys anything in the shop, never expires and cannot be refunded.</p>
          </div>
        </div>
      </article>
    </div>
  );
}
