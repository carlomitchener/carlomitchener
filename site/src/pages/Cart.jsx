import { Icon } from "../components/Icon.jsx";

export function Cart() {
  return (
    <div className="wrap text">
      <div className="page-head">
        <h1>Bag</h1>
      </div>
      <div data-cart-lines></div>
      <div className="sum empty" data-cart-sum>
        <Icon name="shopping_bag" extra="big" />
        <p className="lead">Your bag is empty.</p>
        <a className="pill go" href="/shop/">
          Browse the shop
        </a>
      </div>
      <template id="line">
        <div className="line">
          <a data-href>
            <img alt="" width="88" height="88" decoding="async" />
          </a>
          <div className="who">
            <a data-title></a>
            <p className="fine" data-size></p>
            <div className="qty">
              <button type="button" data-dec aria-label="One less">
                <Icon name="remove" extra="small" />
              </button>
              <b data-qty></b>
              <button type="button" data-inc aria-label="One more">
                <Icon name="add" extra="small" />
              </button>
            </div>
          </div>
          <p className="price" data-total></p>
          <button type="button" data-remove>
            Remove
          </button>
        </div>
      </template>
    </div>
  );
}
