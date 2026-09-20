import { useState } from "react";
import { GIFT } from "../config/shop.ts";
import { buyHref, giftUrl, money } from "../lib/shop.ts";
import { AddToBag } from "../components/AddToBag.jsx";
import { Breadcrumbs } from "../components/Breadcrumbs.jsx";

export const TIERS = [
  { tier: "mini", name: "Mini", tint: "--red", from: 11, to: 99 },
  { tier: "medi", name: "Medi", tint: "--green", from: 111, to: 999 },
  { tier: "maxi", name: "Maxi", tint: "--blue", from: 1111, to: 9999 },
];

const FACE = "/bird/bird-128.png";

const whole = (price) => String(Math.round(Number(price)));

function Face({ card, amount }) {
  return (
    <figure className="face" style={{ "--tint": `var(${card.tint})` }}>
      <div className="face-top">
        <img src={FACE} alt="" width="28" height="28" />
        <span>carlomitchener.com</span>
      </div>
      <p className="face-amount mono">{amount}</p>
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

export function GiftCard({ card, cards, product, buyPrefix }) {
  const [id, setId] = useState("");
  const variant = product.variants.find((one) => one.id === id) ?? product.variants[0];
  return (
    <div className="wrap">
      <Breadcrumbs trail={[{ name: "Gift Card", href: GIFT }, { name: card.name }]} />
      <article className="gift">
        <div className="left">
          <Face card={card} amount={whole(variant.price)} />
        </div>
        <div className="side">
          <div className="details">
            <h1>{`${card.name} Gift Card`}</h1>
            <p className="fine">{`Angel numbers from ${card.from} to ${card.to}.`}</p>
            <p className="price">{money(variant.price)}</p>
            <nav className="tiers" aria-label="Gift card size">
              {cards.map((one) => (
                <a key={one.tier} href={giftUrl(one.tier)} aria-current={one.tier === card.tier ? "page" : undefined}>
                  {one.name}
                </a>
              ))}
            </nav>
            <div className="sizes" role="group" aria-label="Amount">
              {product.variants.map((one) => (
                <button type="button" key={one.id} className="mono" aria-pressed={one.id === variant.id ? "true" : "false"} disabled={!one.available} onClick={() => setId(one.id)}>
                  {whole(one.price)}
                </button>
              ))}
            </div>
            <div className="buy">
              <AddToBag disabled={!product.available} line={{ id: variant.id, key: product.key, title: `${card.name} Gift Card`, size: `$${whole(variant.price)}`, price: variant.price, image: FACE }} />
              <a className="pill wide" href={buyHref(buyPrefix, variant.id)} data-buy rel="noopener">
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
