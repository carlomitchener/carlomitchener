import site from "../../site.json";
import { CATEGORIES, DOCS, FILES, FOOT_COLUMNS, SHOP, SITE } from "../config/shop.ts";
import { useMediaQuery } from "../lib/hooks.ts";
import { collectionUrl } from "../lib/shop.ts";
import { Icon } from "./Icon.jsx";

const year = new Date().getUTCFullYear();

function pack(groups, count) {
  const columns = Array.from({ length: Math.min(count, groups.length) }, () => ({ height: 0, groups: [] }));
  for (const group of [...groups].sort((a, b) => b.links.length - a.links.length)) {
    const column = columns.reduce((low, one) => (one.height < low.height ? one : low));
    column.groups.push(group);
    column.height += group.links.length + 2;
  }
  for (const column of columns) column.groups.sort((a, b) => groups.indexOf(a) - groups.indexOf(b));
  return columns.filter((one) => one.groups.length).sort((a, b) => groups.indexOf(a.groups[0]) - groups.indexOf(b.groups[0]));
}

export function Footer({ catalog = [] }) {
  const wide = useMediaQuery("(min-width: 1024px)");
  const shop = CATEGORIES.map(([slug, name]) => ({ slug, name, href: `${SHOP}${slug}/`, links: catalog.filter((row) => row.category === slug).map((row) => ({ name: row.title, href: collectionUrl(row.handle) })) })).filter((one) => one.links.length);
  const groups = [
    ...shop,
    { slug: "site", name: "Site", links: SITE },
    { slug: "help", name: "Help", links: DOCS },
    { slug: "files", name: "Files", links: FILES },
    { slug: "socials", name: "Socials", links: site.socials, rel: "me noopener" },
  ];
  return (
    <footer className="foot">
      <div className="wrap">
        <nav className="catalog" aria-label="Site">
          {pack(groups, FOOT_COLUMNS).map((column, i) => (
            <div key={i} className="col">
              {column.groups.map((group) => (
                <details key={group.slug} className="drop" open={wide} style={{ order: groups.indexOf(group) }}>
                  <summary>
                    {group.href ? <a href={group.href}>{group.name}</a> : <span>{group.name}</span>}
                    <Icon name="expand_more" extra="small" />
                  </summary>
                  <ul>
                    {group.links.map((one) => (
                      <li key={one.href}>
                        <a href={one.href} rel={group.rel}>
                          {one.name}
                        </a>
                      </li>
                    ))}
                  </ul>
                </details>
              ))}
            </div>
          ))}
        </nav>
        <div className="rule"></div>
        <div className="legal">
          <p className="copy">{`Copyright © ${site.since}-${year} ${site.owner}. All rights reserved.`}</p>
        </div>
      </div>
    </footer>
  );
}
