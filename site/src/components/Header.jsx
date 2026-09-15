import site from "../../site.json";
import { CATEGORIES } from "../config/shop.ts";
import { Icon } from "./Icon.jsx";

const CART = "/cart/";

export function Header({ route, fly = false }) {
  const links = [{ name: "All", href: "/shop/" }, ...CATEGORIES.map(([slug, name]) => ({ name, href: `/shop/${slug}/` }))];
  const current = (href) => (route === href || (href !== "/shop/" && route.startsWith(href)) ? "page" : undefined);
  return (
    <header className="top">
      <div className="bar">
        <details className="menu">
          <summary aria-label="Menu">
            <Icon name="menu" extra="open" />
            <Icon name="close" extra="shut" />
          </summary>
          <div className="sheet">
            <nav aria-label="Menu">
              <ul>
                {links.map((one) => (
                  <li key={one.href}>
                    <a href={one.href} aria-current={current(one.href)}>
                      {one.name}
                      <Icon name="chevron_right" />
                    </a>
                  </li>
                ))}
              </ul>
              <ul className="rest">
                {site.pages.map((one) => (
                  <li key={one.href}>
                    <a href={one.href}>{one.name}</a>
                  </li>
                ))}
              </ul>
            </nav>
          </div>
        </details>
        <a className="mark" href="/" aria-label={fly ? "TheBird" : "Home"} data-fly={fly ? "" : undefined}>
          <img src="/bird/bird-128.png" alt="TheBird" width="28" height="28" />
        </a>
        <nav className="links" aria-label="Shop">
          <ul>
            {links.map((one) => (
              <li key={one.href}>
                <a href={one.href} aria-current={current(one.href)}>
                  {one.name}
                </a>
              </li>
            ))}
          </ul>
        </nav>
        <div className="tools">
          <button className="tool" type="button" data-theme-button aria-label="Theme: auto" title="Theme: auto">
            <Icon name="brightness_auto" />
          </button>
          <button className="tool tint" type="button" data-tint-button aria-label="Tint" title="Tint">
            <Icon name="palette" />
          </button>
          <a className="tool bag" href={CART} aria-label="Bag">
            <Icon name="shopping_bag" />
            <span className="count" data-cart-count hidden></span>
          </a>
        </div>
      </div>
    </header>
  );
}
