import { useSyncExternalStore } from "react";
import { checkoutUrl, clear, count, load, remove, server, setQty, subscribe, total } from "../lib/cart.ts";
import { designOf, GIFT_PREFIX, lineUrl, money } from "../lib/shop.ts";
import { Icon } from "../components/Icon.jsx";

function Line({ item }) {
  const href = lineUrl(item.key);
  return (
    <div className="line">
      <a href={href}>
        <img src={item.image} alt="" width="88" height="88" decoding="async" />
      </a>
      <div className="who">
        <a href={href}>{item.key.startsWith(GIFT_PREFIX) ? item.title : `${item.title} (${designOf(item.key)})`}</a>
        <p className="fine">{`${item.size} · ${money(item.price)}`}</p>
        <div className="qty">
          <button type="button" aria-label="One less" onClick={() => setQty(item.id, item.qty - 1)}>
            <Icon name="remove" extra="small" />
          </button>
          <b>{item.qty}</b>
          <button type="button" aria-label="One more" onClick={() => setQty(item.id, item.qty + 1)}>
            <Icon name="add" extra="small" />
          </button>
        </div>
      </div>
      <p className="price">{money(Number(item.price) * item.qty)}</p>
      <button type="button" className="remove" onClick={() => remove(item.id)}>
        Remove
      </button>
    </div>
  );
}

export function Cart() {
  const items = useSyncExternalStore(subscribe, load, server);
  const n = count(items);
  return (
    <div className="wrap text">
      <div className="page-head">
        <h1>Bag</h1>
      </div>
      <div>
        {items.map((item) => (
          <Line key={item.id} item={item} />
        ))}
      </div>
      {items.length ? (
        <div className="sum">
          <p className="total">{`${n} item${n === 1 ? "" : "s"} · ${money(total(items))}`}</p>
          <a className="pill go" href={checkoutUrl(items) || "/cart/"}>
            Checkout
          </a>
          <button type="button" className="pill" onClick={clear}>
            Clear bag
          </button>
          <a className="back" href="/shop/">
            Continue shopping
          </a>
        </div>
      ) : (
        <div className="sum empty">
          <Icon name="shopping_bag" extra="big" />
          <p className="lead">Your bag is empty.</p>
          <a className="pill go" href="/shop/">
            Browse the shop
          </a>
        </div>
      )}
    </div>
  );
}
