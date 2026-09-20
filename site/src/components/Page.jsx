import site from "../../site.json";
import { SHOPIFY_CDN, THEME_COLORS } from "../config/shop.ts";
import { MODE_SCRIPT } from "../config/boot.ts";

const FONTS = "/fonts/fonts.css";

const json = (value) => JSON.stringify(value).replace(/[<\u2028\u2029]/g, (c) => "\\u" + c.charCodeAt(0).toString(16).padStart(4, "0"));

export function Page({ root, route, title, description, image, type = "website", meta = [], sheets = [], scripts = [], sky, data, noindex = false, preconnect, app = "", props }) {
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
        {preconnect ? <link rel="preconnect" href={preconnect} /> : null}
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
        <link rel="preload" href="/fonts/sans.woff2" as="font" type="font/woff2" crossOrigin="" />
        <link rel="preload" href="/fonts/icons.woff2" as="font" type="font/woff2" crossOrigin="" />
        <link rel="stylesheet" href={FONTS} />
        {sheets.map((href) => (
          <link key={href} rel="stylesheet" href={href} />
        ))}
        {data ? <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json(data) }} /> : null}
      </head>
      <body>
        <a className="skip" href="#main">
          Skip to content
        </a>
        <div id="app" dangerouslySetInnerHTML={{ __html: app }}></div>
        <section className="sky" data-sky={sky} aria-label="The sky">
          <canvas id="sky"></canvas>
        </section>
        <script id="props" type="application/json" dangerouslySetInnerHTML={{ __html: json(props) }} />
        {scripts.map((src) => (
          <script key={src} type="module" src={src} />
        ))}
      </body>
    </html>
  );
}
