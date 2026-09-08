import { Menu as Sitemap, Shell } from 'mrlyjs/ui/chrome.jsx';
import { configure } from 'mrlyjs/ui/config.js';
import site from '../site.json';
import { grid, money, ogUrl, tileUrl, artUrl } from './shop.ts';

configure(site);

const CATEGORIES = [
  ['accessories', 'Accessories'],
  ['bags', 'Bags'],
  ['kids', 'Kids'],
  ['men', 'Men'],
  ['unisex', 'Unisex'],
  ['women', 'Women'],
];

/* SHELL */

export function Page({ route, nav, controls, wide, children }) {
  return (
    <Shell route={route} tree={nav} controls={controls} wide={wide}>
      {children}
    </Shell>
  );
}

/* PIECES */

function Card({ product, width = 600, eager = false, pick = 0 }) {
  const image = product.images.length ? product.images[pick % product.images.length] : null;
  return (
    <a className="tile" href={`/products/${product.key}/`}>
      {image ? (
        <img
          src={grid(image.url, width)}
          alt={image.alt || product.title}
          width={width}
          height={width}
          loading={eager ? 'eager' : 'lazy'}
          fetchPriority={eager ? 'high' : undefined}
          decoding="async"
        />
      ) : (
        <img src={tileUrl(product.key, 3)} alt={product.title} width="88" height="88" loading="lazy" decoding="async" />
      )}
      <h2>{product.title}</h2>
      <p className="num">{money(product.price)}</p>
    </a>
  );
}

function Gallery({ products, eager = 0 }) {
  return (
    <div className="gallery square">
      {products.map((product, i) => (
        <Card key={product.key} product={product} eager={i < eager} pick={i} />
      ))}
    </div>
  );
}

export function Filter({ label, count, next }) {
  return (
    <>
      <a className="filter" href={next}>{`${label} (${count})`}</a>
      <ul className="tabs stack">
        <li><a href="/collections/all/">All</a></li>
        {CATEGORIES.map(([slug, name]) => (
          <li key={slug}><a href={`/collections/${slug}/`}>{name}</a></li>
        ))}
      </ul>
    </>
  );
}

function Deck({ cards }) {
  return (
    <div className="cards">
      {cards.map((card) => (
        <a className="card" key={card.href} href={card.href}>
          {card.image ? (
            <img src={grid(card.image.url, 600)} alt={card.name} width="600" height="600" loading="lazy" decoding="async" />
          ) : (
            <img src={tileUrl(card.key, 3)} alt={card.name} width="88" height="88" loading="lazy" decoding="async" />
          )}
          <p className="code">
            {card.emoji ? <span role="img" aria-label={card.name}>{card.emoji}</span> : null} {card.name}
          </p>
          <p className="name">{`${card.count} design${card.count === 1 ? '' : 's'}`}</p>
        </a>
      ))}
    </div>
  );
}

/* HOME */

export function Home({ products, lead }) {
  return (
    <>
      <div className="lede">
        <h1>{site.name}</h1>
        <p className="lead">{lead}</p>
      </div>
      <Gallery products={products} eager={2} />
    </>
  );
}

/* COLLECTIONS */

export function Collections({ groups, lead }) {
  return (
    <>
      <div className="lede">
        <h1>Collections</h1>
        <p className="lead">{lead}</p>
      </div>
      {groups.map((group) => (
        <section key={group.name}>
          <h2>{group.name}</h2>
          <Deck cards={group.cards} />
        </section>
      ))}
    </>
  );
}

export function Collection({ name, products }) {
  return (
    <>
      <div className="lede">
        <h1>{name}</h1>
        <p className="lead">{`${products.length} design${products.length === 1 ? '' : 's'}`}</p>
      </div>
      <Gallery products={products} eager={2} />
    </>
  );
}

/* PRODUCT */

export function Product({ product, siblings, collection, files, tiles }) {
  const images = product.images;
  return (
    <>
      <div className="lede">
        <h1>
          <a href={collection}>{product.title}</a>
        </h1>
        <p className="fine">Design {product.key}</p>
      </div>
      <div className="gallery square" data-mockups>
        {images.map((image, i) => (
          <a className="tile" key={image.style} href={grid(image.url, 2000)} data-style={image.style}>
            <img
              src={grid(image.url, 1000)}
              alt={image.alt}
              width="1000"
              height="1000"
              loading={i === 0 ? 'eager' : 'lazy'}
              fetchPriority={i === 0 ? 'high' : undefined}
              decoding="async"
              data-style={image.style}
            />
          </a>
        ))}
      </div>
      <div className="strip" data-strip>
        {tiles.map((n) => (
          <a key={n} href={tileUrl(product.key, n)} download data-tile={n}>
            <img src={tileUrl(product.key, n)} alt={`${product.key} ${n}x${n}`} width="88" height="88" loading="lazy" decoding="async" data-tile={n} />
          </a>
        ))}
      </div>
      <p className="fine" data-downloads>
        <span>Download </span>
        {files.map((name) => (
          <a key={name} href={artUrl(product.key, name)} download>{name}</a>
        ))}
        {tiles.map((n) => (
          <a key={`t${n}`} href={tileUrl(product.key, n)} download>{`${n}x${n}`}</a>
        ))}
        <a href={ogUrl(product.key)} download>og</a>
      </p>
      <h2 id="designs">Designs</h2>
      <div className="gallery square" data-siblings>
        {siblings.map((one) => (
          <a
            className="tile"
            key={one.key}
            href={`/products/${one.key}/`}
            aria-current={one.key === product.key ? 'page' : undefined}
            data-key={one.key}
          >
            <img src={tileUrl(one.key, 3)} alt={one.key} width="88" height="88" loading="lazy" decoding="async" />
            <p className="num">{money(one.price)}</p>
          </a>
        ))}
      </div>
    </>
  );
}

export function Controls({ product, printful, sizes, index, total, buy, expires, live }) {
  return (
    <>
      <p className="num price" data-price>{money(product.price)}</p>
      {sizes.length > 1 && (
        <div className="tabs sizes">
          {sizes.map((size) => (
            <button
              type="button"
              key={size.id}
              data-variant={size.id}
              data-price={size.price}
              data-size={size.size}
              aria-pressed={size.id === product.variant ? 'true' : 'false'}
            >
              {size.size}
            </button>
          ))}
        </div>
      )}
      <button
        type="button"
        className="primary"
        data-add
        data-key={product.key}
        data-title={product.title}
        data-variant={product.variant}
        data-price={product.price}
        data-size={product.variants[0] ? product.variants[0].size : ''}
        disabled={!product.available}
      >
        Add to cart
      </button>
      <a className="buy" href={buy} data-buy rel="noopener">Buy now</a>
      <p className="count" data-expiry={expires} data-live={live} data-ttl></p>
      <div className="row pager">
        <button type="button" data-prev disabled={total < 2}>Prev</button>
        <span className="num" data-index>{`${index + 1} / ${total}`}</span>
        <button type="button" data-next disabled={total < 2}>Next</button>
      </div>
      <button type="button" data-share>Share</button>
      <a className="button" href={printful} rel="noopener">View on Printful</a>
    </>
  );
}

/* CART */

export function Cart() {
  return (
    <>
      <div className="lede">
        <h1>Cart</h1>
      </div>
      <div data-cart-lines></div>
      <div className="sum" data-cart-sum></div>
      <template id="line">
        <div className="line">
          <a className="shot" data-href>
            <img alt="" width="88" height="88" decoding="async" />
          </a>
          <div className="who">
            <a data-title></a>
            <p className="dim" data-size></p>
            <div className="qty">
              <button type="button" data-dec aria-label="One less">-</button>
              <b className="num" data-qty></b>
              <button type="button" data-inc aria-label="One more">+</button>
            </div>
          </div>
          <p className="num" data-total></p>
          <button type="button" data-remove>Remove</button>
        </div>
      </template>
    </>
  );
}

/* PAGES */

export function Menu({ nav }) {
  return (
    <>
      <div className="lede">
        <h1>Menu</h1>
        <p className="lead">Every page on {site.name}.</p>
      </div>
      <Sitemap tree={nav} />
    </>
  );
}

export function Doc({ title, lead, body, hero, action }) {
  return (
    <>
      {hero && (
        <figure className="opener">
          <img className="dark" src={`/figures/${hero}-dark.png`} alt="" width="1024" height="1024" decoding="async" />
          <img className="light" src={`/figures/${hero}-light.png`} alt="" width="1024" height="1024" decoding="async" />
        </figure>
      )}
      <div className="lede">
        <h1>{title}</h1>
        {lead && <p className="lead">{lead}</p>}
      </div>
      {action && (
        <div className="prose">
          <p><a className="button primary" href={action.href}>{action.name}</a></p>
        </div>
      )}
      {body && <article className="prose" dangerouslySetInnerHTML={{ __html: body }}></article>}
    </>
  );
}

export function NotFound() {
  return (
    <div className="lede">
      <h1>Not found</h1>
      <p className="lead">That page is gone, or the design expired.</p>
      <p><a href="/">Back to the shop</a></p>
    </div>
  );
}
