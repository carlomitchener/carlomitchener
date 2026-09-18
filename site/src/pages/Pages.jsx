import site from "../../site.json";

export const PAGES = [
  { name: "Home", href: "/", note: "The feed and the newest variations." },
  { name: "Shop", href: "/shop/", note: "Every live variation." },
  { name: "Feed", href: "/feed/", note: "Every post, newest first." },
  ...site.pages.map((one) => ({ ...one, note: "" })),
  { name: "Gift Card", href: "/gift-card/", note: "Mini, medi and maxi. Angel numbers." },
  { name: "Status", href: "/status/", note: "The automator, the CDN and the Lambdas." },
  { name: "Bag", href: "/cart/", note: "Your bag." },
  { name: "Pages", href: "/pages/", note: "This list." },
];

export const FILES = [
  { name: "robots.txt", href: "/robots.txt", note: "Who may crawl, and where the sitemap is." },
  { name: "llms.txt", href: "/llms.txt", note: "The site on one page, for machines." },
  { name: "sitemap.xml", href: "/sitemap.xml", note: "Every indexable route with its date." },
  { name: "manifest.webmanifest", href: "/manifest.webmanifest", note: "The web app manifest." },
  { name: "search.json", href: "/search.json", note: "The search index the header reads." },
  { name: "404", href: "/404.html", note: "Not found, or its moon has passed." },
];

export function Pages({ groups }) {
  return (
    <div className="wrap text">
      <div className="page-head">
        <h1>Pages</h1>
        <p className="lead">Every route this site serves.</p>
      </div>
      {groups.map((group) => (
        <section key={group.name} className="routes-group" aria-labelledby={`routes-${group.name}`}>
          <h2 id={`routes-${group.name}`}>{group.name}</h2>
          <ul className="routes">
            {group.rows.map((row) => (
              <li key={row.href}>
                <span className="who">
                  <a href={row.href}>{row.name}</a>
                  <code>{row.href}</code>
                </span>
                <p>{row.note}</p>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
