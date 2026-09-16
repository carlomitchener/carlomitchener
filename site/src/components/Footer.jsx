import site from "../../site.json";
import { CATEGORIES } from "../config/shop.ts";
import { Icon } from "./Icon.jsx";

const year = new Date().getUTCFullYear();

const FILES = [
  { name: "404", href: "/404.html" },
  { name: "robots.txt", href: "/robots.txt" },
  { name: "llms.txt", href: "/llms.txt" },
  { name: "sitemap.xml", href: "/sitemap.xml" },
];

export function Footer({ catalog = [] }) {
  return (
    <footer className="foot">
      <div className="wrap">
        <nav className="catalog" aria-label="Catalog" data-catalog>
          {CATEGORIES.map(([slug, name]) => (
            <details key={slug} className="drop">
              <summary>
                <a href={`/shop/${slug}/`}>{name}</a>
                <Icon name="expand_more" extra="small" />
              </summary>
              <ul>
                {catalog
                  .filter((row) => row.category === slug)
                  .map((row) => (
                    <li key={row.handle}>
                      <a href={`/shop/${slug}/${row.handle}/`}>{row.title}</a>
                    </li>
                  ))}
              </ul>
            </details>
          ))}
        </nav>
        <div className="rule"></div>
        <ul className="socials">
          {site.socials.map((one) => (
            <li key={one.href}>
              <a href={one.href} rel="me noopener">
                {one.name}
              </a>
            </li>
          ))}
        </ul>
        <div className="rule"></div>
        <div className="legal">
          <p className="copy">{`Copyright © ${site.since}-${year} ${site.owner}. All rights reserved.`}</p>
          <ul className="pages">
            {[...site.pages, ...FILES].map((one) => (
              <li key={one.href}>
                <a href={one.href}>{one.name}</a>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </footer>
  );
}
