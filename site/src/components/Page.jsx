import site from "../../site.json";
import { MODE_KEY, SHOPIFY_CDN, THEME_COLORS } from "../config/shop.ts";
import { Header } from "./Header.jsx";
import { Footer } from "./Footer.jsx";

const FONTS = "/fonts/fonts.css";

const MODE_SCRIPT = `(function(){try{var r=document.documentElement,k="${MODE_KEY}",c={light:"${THEME_COLORS.light}",dark:"${THEME_COLORS.dark}"},m=new URLSearchParams(location.search).get("mode");if(m!=="dark"&&m!=="light"){m=null;try{m=localStorage.getItem(k)}catch(e){}}if(m!=="dark"&&m!=="light")m=matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light";r.dataset.mode=m;var t=document.querySelector('meta[name="theme-color"]');if(t)t.content=c[m]}catch(e){}})();`;

export function Page({ root, route, title, description, image, type = "website", meta = [], sheets = [], scripts = [], data, noindex = false, catalog, latest = {}, now, fly = false, children }) {
  const url = root + route;
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <meta name="color-scheme" content="light dark" />
        <meta name="theme-color" content={THEME_COLORS.light} />
        <script dangerouslySetInnerHTML={{ __html: MODE_SCRIPT }} />
        <title>{title === site.name ? site.name : `${title} · ${site.name}`}</title>
        <meta name="description" content={description} />
        {noindex ? <meta name="robots" content="noindex" /> : null}
        <link rel="canonical" href={url} />
        <link rel="preconnect" href={SHOPIFY_CDN} />
        <meta property="og:site_name" content={site.name} />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
        <meta property="og:url" content={url} />
        <meta property="og:type" content={type} />
        {image ? <meta property="og:image" content={image} /> : null}
        {meta.map((one) => (
          <meta key={one.property || one.name} {...one} />
        ))}
        <meta name="twitter:card" content="summary_large_image" />
        {image ? <meta name="twitter:image" content={image} /> : null}
        <link rel="icon" href="/bird/bird-64.png" type="image/png" />
        <link rel="apple-touch-icon" href="/bird/square-180.png" />
        <link rel="manifest" href="/manifest.webmanifest" />
        <link rel="stylesheet" href={FONTS} />
        {sheets.map((href) => (
          <link key={href} rel="stylesheet" href={href} />
        ))}
        {data ? <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} /> : null}
        {scripts.map((src) => (
          <script key={src} type="module" src={src} />
        ))}
      </head>
      <body>
        <a className="skip" href="#main">
          Skip to content
        </a>
        <Header route={route} catalog={catalog} latest={latest} now={now} fly={fly} />
        <div className="veil" data-veil></div>
        <main id="main">{children}</main>
        <Footer catalog={catalog} />
      </body>
    </html>
  );
}
