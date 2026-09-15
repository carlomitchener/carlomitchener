import site from "../../site.json";
import { SHOPIFY_CDN } from "../config/shop.ts";
import { THEME_KEY, TINT_KEY } from "../config/tint.ts";
import { Header } from "./Header.jsx";
import { Footer } from "./Footer.jsx";

const FONTS = "/fonts/fonts.css";

const EARLY = `(()=>{try{const r=document.documentElement,t=localStorage.getItem(${JSON.stringify(THEME_KEY)}),c=localStorage.getItem(${JSON.stringify(TINT_KEY)});if(t)r.dataset.theme=t;if(c)r.dataset.tint=c}catch{}})()`;

export function Page({ root, route, title, description, image, type = "website", meta = [], sheets = [], scripts = [], data, noindex = false, tint, catalog, fly = false, children }) {
  const url = root + route;
  return (
    <html lang="en" data-tint={tint}>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <meta name="color-scheme" content="light dark" />
        <meta name="theme-color" media="(prefers-color-scheme: light)" content="#ffffff" />
        <meta name="theme-color" media="(prefers-color-scheme: dark)" content="#000000" />
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
        <script dangerouslySetInnerHTML={{ __html: EARLY }} />
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
        <Header route={route} fly={fly} />
        <main id="main">{children}</main>
        <Footer catalog={catalog} />
      </body>
    </html>
  );
}
