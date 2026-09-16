import site from "../../site.json";
import { CATEGORIES, FOOT_COLUMNS } from "../config/shop.ts";
import { Icon } from "./Icon.jsx";

const year = new Date().getUTCFullYear();

const FILES = [
  { name: "404", href: "/404.html" },
  { name: "robots.txt", href: "/robots.txt" },
  { name: "llms.txt", href: "/llms.txt" },
  { name: "sitemap.xml", href: "/sitemap.xml" },
];

function pack(groups, count) {
  const columns = Array.from({ length: Math.min(count, groups.length) }, () => ({ height: 0, groups: [] }));
  for (const group of [...groups].sort((a, b) => b.rows.length - a.rows.length)) {
    const column = columns.reduce((low, one) => (one.height < low.height ? one : low));
    column.groups.push(group);
    column.height += group.rows.length + 2;
  }
  for (const column of columns) column.groups.sort((a, b) => groups.indexOf(a) - groups.indexOf(b));
  return columns.filter((one) => one.groups.length).sort((a, b) => groups.indexOf(a.groups[0]) - groups.indexOf(b.groups[0]));
}

export function Footer({ catalog = [] }) {
  const groups = CATEGORIES.map(([slug, name]) => ({ slug, name, rows: catalog.filter((row) => row.category === slug) })).filter((one) => one.rows.length);
  return (
    <footer className="foot">
      <div className="wrap">
        <nav className="catalog" aria-label="Catalog" data-catalog>
          {pack(groups, FOOT_COLUMNS).map((column, i) => (
            <div key={i} className="col">
              {column.groups.map((group) => (
                <details key={group.slug} className="drop" style={{ order: groups.indexOf(group) }}>
                  <summary>
                    <a href={`/shop/${group.slug}/`}>{group.name}</a>
                    <Icon name="expand_more" extra="small" />
                  </summary>
                  <ul>
                    {group.rows.map((row) => (
                      <li key={row.handle}>
                        <a href={`/shop/${group.slug}/${row.handle}/`}>{row.title}</a>
                      </li>
                    ))}
                  </ul>
                </details>
              ))}
            </div>
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
