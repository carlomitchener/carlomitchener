import { CATEGORIES } from "../config/shop.ts";
import { Icon } from "./Icon.jsx";

const CART = "/cart/";

export function Header({ route, catalog = [], fly = false }) {
  const links = [{ slug: "all", name: "All", href: "/shop/" }, ...CATEGORIES.map(([slug, name]) => ({ slug, name, href: `/shop/${slug}/` }))];
  const current = (href) => (route === href || (href !== "/shop/" && route.startsWith(href)) ? "page" : undefined);
  const rows = (slug) => (slug === "all" ? CATEGORIES.map(([s, name]) => ({ title: name, href: `/shop/${s}/` })) : catalog.filter((row) => row.category === slug).map((row) => ({ title: row.title, href: `/shop/${slug}/${row.handle}/` })));
  return (
    <header className="top" data-header>
      <div className="bar">
        <a className="mark" href="/" aria-label={fly ? "TheBird" : "Home"} data-fly={fly ? "" : undefined}>
          <img src="/bird/bird-128.png" alt="TheBird" width="28" height="28" />
        </a>
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
          <a className="tool bag" href={CART} aria-label="Bag">
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
              <div key={one.slug} className="pane" data-pane={one.slug} hidden>
                <p className="fine">Explore {one.name}</p>
                <ul className="big">
                  <li>
                    <a href={one.href}>{one.slug === "all" ? "Explore All" : `Explore All ${one.name}`}</a>
                  </li>
                  {rows(one.slug).map((row) => (
                    <li key={row.href}>
                      <a href={row.href}>{row.title}</a>
                    </li>
                  ))}
                </ul>
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
                {links.map((one) => (
                  <li key={one.href}>
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
                {links.map((one) => (
                  <li key={one.href}>
                    <a href={one.href} aria-current={current(one.href)}>
                      {one.name}
                      <Icon name="chevron_right" extra="small" />
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
      <div className="veil" data-veil></div>
    </header>
  );
}
