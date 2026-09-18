import { CATEGORIES } from "../config/shop.ts";
import { Icon } from "./Icon.jsx";
import { ProductCard } from "./ProductCard.jsx";
import { PAGES } from "../pages/Pages.jsx";

const CART = "/cart/";

export function Header({ route, catalog = [], latest = {}, now, fly = false }) {
  const links = [{ slug: "all", name: "All", href: "/shop/" }, ...CATEGORIES.map(([slug, name]) => ({ slug, name, href: `/shop/${slug}/` })), { slug: "pages", name: "Pages", href: "/pages/" }];
  const current = (href) => (route === href || (href !== "/shop/" && route.startsWith(href)) ? "page" : undefined);
  const rows = (slug) =>
    slug === "all"
      ? CATEGORIES.map(([s, name]) => ({ title: name, href: `/shop/${s}/` }))
      : slug === "pages"
        ? PAGES.filter((one) => one.href !== "/cart/").map((one) => ({ title: one.name, href: one.href }))
        : catalog.filter((row) => row.category === slug).map((row) => ({ title: row.title, href: `/${row.handle}/` }));
  return (
    <header className="top" data-header>
      <div className="bar">
        <div className="home">
          <a className="mark" href="/" aria-label={fly ? "TheBird" : "Home"} data-fly={fly ? "" : undefined}>
            <img src="/bird/bird-128.png" alt="TheBird" width="28" height="28" />
          </a>
          <button className="tool back" type="button" aria-label="Back" data-back>
            <Icon name="chevron_left" />
          </button>
        </div>
        <nav className="links" aria-label="Shop">
          <ul>
            {links.map((one) => (
              <li key={one.href}>
                <a href={one.href} aria-current={current(one.href)} data-menu={one.slug}>
                  {one.name}
                </a>
              </li>
            ))}
          </ul>
        </nav>
        <div className="tools">
          <button className="tool" type="button" aria-label="Search" data-search>
            <Icon name="search" />
          </button>
          <button className="tool mode" type="button" aria-label="Switch to dark mode" data-mode>
            <Icon name="dark_mode" extra="moon" />
            <Icon name="light_mode" extra="sun" />
          </button>
          <a className="tool bag" href={CART} aria-label="Bag" data-bag>
            <Icon name="shopping_bag" />
            <span className="count" data-cart-count hidden></span>
          </a>
          <button className="tool burger" type="button" aria-label="Menu" aria-expanded="false" data-burger>
            <Icon name="menu" extra="open" />
            <Icon name="close" extra="shut" />
          </button>
        </div>
      </div>
      <div className="flyout" data-flyout>
        <div className="inside">
          <div className="wrap">
            {links.map((one) => (
              <div key={one.slug} className="pane explore" data-pane={one.slug} hidden>
                <div className="list">
                  <p className="fine">Explore {one.name}</p>
                  <a className="lead" href={one.href}>
                    {one.slug === "all" ? "Explore All" : one.slug === "pages" ? "All Pages" : `Explore All ${one.name}`}
                  </a>
                  <ul className="cols">
                    {rows(one.slug).map((row, i) => (
                      <li key={row.href} style={{ "--i": i }}>
                        <a href={row.href}>{row.title}</a>
                      </li>
                    ))}
                  </ul>
                </div>
                {latest[one.slug] ? (
                  <div className="just">
                    <p className="fine">Just Generated</p>
                    <ProductCard product={latest[one.slug]} width={400} now={now} />
                  </div>
                ) : null}
              </div>
            ))}
            <div className="pane finder" data-pane="search" hidden>
              <form className="field" role="search" data-form>
                <Icon name="search" />
                <input type="search" name="q" placeholder="Search" autoComplete="off" aria-label="Search" data-query />
              </form>
              <p className="fine" data-quick-title>
                Quick Links
              </p>
              <ul className="quick" data-quick>
                {links.map((one, i) => (
                  <li key={one.href} style={{ "--i": i }}>
                    <a href={one.href}>
                      <Icon name="arrow_forward" extra="small" />
                      {one.name}
                    </a>
                  </li>
                ))}
              </ul>
              <ul className="quick results" data-results hidden></ul>
            </div>
            <div className="pane sheet" data-pane="menu" hidden>
              <ul className="big">
                {links.map((one, i) => (
                  <li key={one.href} style={{ "--i": i }}>
                    <button type="button" data-sub={one.slug} aria-current={current(one.href)}>
                      <span>{one.name}</span>
                      <Icon name="chevron_right" extra="small" />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
            <div className="pane purse" data-pane="bag" hidden>
              <p className="fine" data-bag-title>
                Your Bag
              </p>
              <ul className="lines" data-bag-lines></ul>
              <p className="lead" data-bag-empty>
                Your bag is empty.
              </p>
              <p className="get">
                <a className="pill go" href={CART}>
                  Review Bag
                </a>
                <a className="pill" href={CART} data-checkout hidden>
                  Checkout
                </a>
              </p>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
