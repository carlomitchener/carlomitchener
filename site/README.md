# SITE

- carlomitchener.com: the avatar sky as the first screen, then the repo's `README.md` as a plain page, served by a Cloudflare Worker.
- Run from the repo root: `bun run --cwd site <script>`.

## SCRIPTS

- `build` - `build.ts` renders `../README.md` with `Bun.markdown.html` into `dist/index.html`, points relative links at GitHub (`tree` for a folder, `blob` for a file), and writes `404.html`, `site.css`, `sky.js`, the favicons and `_headers`.
- `dev` - `dev.ts` builds, serves `dist/` on port 3000 (`PORT` picks another) with the same headers, less `upgrade-insecure-requests`, which would send Safari to `https://127.0.0.1`, and rebuilds on any edit to `README.md`, `avatar/`, `site/src/` or `site/public/`; Ctrl-C stops it.
- `shots` - builds, then `shots.ts` serves `dist/` on 3336 and drives one headless Chrome on 9336 with one profile: `/`, `/?at=1.2` and `/404.html` (add `/?splash=off` for the static path) at phone, tablet and desktop, light and dark, into `data/site/shots/`; it prints console errors and overflow, then kills Chrome. Routes as arguments narrow it; `--nojs` turns JavaScript off and shoots each route's top and full page only.
- On `/` it shoots the splash at rest, holds the pointer to unlock it, waits for `splashdone`, checks the wheel scrolls, shoots the fade and the page, checks the sky paused and the fog is on, then taps the sky from mid-scroll and checks the splash relocks at the top. Chrome runs on the Metal GPU (`--use-angle=metal`): under swiftshader one fling takes 40 to 60 s.
- `stats` - `stats.ts` reads up to 365 days of daily totals from Cloudflare's GraphQL Analytics API, merges them by date into `public/stats.json` (committed, one day a line, so history outlives Cloudflare's retention; the build serves it at `/stats.json`), then rewrites the `## Stats` table of `../README.md` from the last 30 days (visitors as the sum of daily unique IPs, page views, top countries, the UTC time of the run) with a View all link, placed before the closing line on its first run. It needs `CLOUDFLARE_STATS_TOKEN` in the environment or the repo's `.env`, a token with Zone Read and Analytics Read on carlomitchener.com; without it, or on any API error, it leaves both files alone and says so.
- `deploy` - stats, build, then `wrangler deploy`.
- `net` - `net/build.ts` builds the MrlyNet edition of the site from `net/` (below) with the host at `../../mrlyprod/mrlyprod` (`MRLY_HOST` picks another) into `data/site/net/dist/` (`MRLY_DIST` picks another); `bun run --cwd site net dev` serves it through the host dev server.
- `ship`, `preview:net`, `deploy:net` - the MrlyNet edition on the same Worker; see SWITCH.

## PIECES

- `sky.js` is `avatar/` bird, avatar, sky-core, sky-mood, sky-clouds, sky-light, sky-weather, sky-bird and sky, then `src/mount.js`, then `avatar/splash.js`, joined in `data/site/sky.js` and bundled as one IIFE, so they share one scope.
- The sky is the first section, `100lvh` tall in normal flow, so it fills the screen behind iOS's floating toolbar; the README follows as an ordinary page, and `.fog`, a fixed top gradient in the page colour, fades the text as it scrolls past the top.
- `src/mount.js` turns off scroll restoration and starts at the top unless the URL has a `#hash`, so a reload never opens the splash over the README; it ties the sky's opacity to scroll, fully faded at 80% of its height, melts its bottom edge into the page through `--melt` as soon as it leaves the top, and the fog's to the inverse, so the fog is off at the top and fully on once the sky is gone; it pauses the sky once faded, hidden or under reduced motion, and `G.visible` follows. While `html.splashing` is set it leaves the sky alone, which covers `splashlock` too, since the splash sets the class before firing it; `splashdone` runs `fade()` once.
- Nothing covers the sky canvas but the open `#splash`, `.fog` and the `.sky::after` melt, all `pointer-events: none`, so a tap on the sky reaches it from any scroll position and replays the splash. No `overscroll-behavior` anywhere, so pull-to-refresh, which replays the splash too, keeps working.
- `#splash` is on the home page only, a direct child of `body`; `avatar/splash.css` joins `site.css` and makes it a fixed full-screen overlay at z-index 10, transparent once open, and hidden without JavaScript by `src/still.css`, which a `<noscript>` link loads on every page.
- `worker.ts` 301s `www.` to the apex and hands everything else to `ASSETS`; `run_worker_first` lets it see every request, and `_headers` still applies through `env.ASSETS.fetch`.
- `_headers`: HSTS with preload, nosniff, referrer, permissions-policy, COOP, and a CSP with `script-src 'self'` and no inline script; `style-src` keeps `'unsafe-inline'`, and `img-src` allows `data:` for the splash's SVG glow mask.
- Without JavaScript the sky is the splash at rest, still: `src/still.css` paints `.sky` with `still-<theme>.svg` (the bird and its fringe, 92vmin, the splash's own scale) over `glow-<theme>.webp` (the glow on a canvas padded by half on every side, 184vmin) on the theme's ground.
- `public/bird/` is `avatar/bird.py`'s output; the build copies `bird-32.png`, `bird-192.png`, `square-180.png` and the four still files.

## NET

- `net/` is carlomitchener.com as a site of MrlyNet's host, built by the host from this folder, with no file copied from the host repo: the host's modules come in by local path (`net/shell.ts`, `net/sdk.ts`, `net/page.ts`, the design), until they ship as packages.
- `site.json` is the identity: title, wordmark, mark, tint, desk, socials, `llms.txt`, fonts, shots; `launchpad.json` the Launchpad and the dock; `redirects.json` the moved urls.
- `pages/` are the routes from the README: `home` (bare, the sky behind it), `about`, `mrly`, `oeis`, `favorites`, `links` (markdown), `menu` (the Launchpad) and `missing` (the 404).
- `apps/` are the two apps: `sky` (the avatar sky, also the desktop through `desk`, with three savers) and `bird` (the recipe drawn live: glow, fringe, wings).
- `designs/sky/` is the site's own design: glass's parts and sheets by path, its own bar (the bird mark and the name in place of glass's folding wordmark and cart), its own skin and `sky.css`. The host loads it once it reads `site.json` `designs` (a list of design folders beside its own); until then `design` pins `classic`, the one public design that draws the desk canvas without a brand wordmark.
- `figures.ts` draws the icon figures: the bird from `../avatar/bird.json`, and 5x5 MrlyFont-style grids.
- `build.ts` links `wasm` and `node_modules` to the host's, writes `data/site/net/avatar.js` (the avatar files as one ES module: `Avatar`, `BIRD`, `PALETTE`, and `sky(canvas, search)`, a fresh sky per call with its own listeners, freed by `off()`), writes `public/` (`mark.svg` from the recipe, the favicons, `stats.json`) and the bird `icon.svg` of `home` and `bird`, then runs the host build; all of it is gitignored.
- The app scenes drive the sky with the host's clock: `sky.step(dt)` and `sky.paint()` from `draw()`, the URL hooks as the `search` string, the sky's own keys off and the host's keys (`v d t s w`) in their place.
- Phones: `min` is `[320, 480]`, so the host never hides the site behind its desktop floor; the phone form is untested here.

## SWITCH

- Ready, not flipped: `wrangler.jsonc` and `worker.ts` still serve `site/dist/`; nothing below touches them.
- Flip: `bun run --cwd site deploy:net` - stats, `ship.ts` (the `net` build into `data/site/net/dist/`, then its `_headers`), then `wrangler deploy -c wrangler.net.jsonc`, the same Worker name and domains, so it replaces the live one.
- Before the first flip: `bun run --cwd site preview:net` runs the same Worker, assets and `_headers` locally in `wrangler dev` (no login, http://localhost:8787); open every route with the console open, since the CSP is new to the build; Ctrl-C stops it.
- Back: `bun run --cwd site deploy` redeploys today's site over it.
- Keep it: once happy, make `deploy` the `deploy:net` line and delete `worker.ts`, `wrangler.jsonc`, `build.ts`'s page half, `dev.ts`, `serve.ts`, `src/`.
- `wrangler.net.jsonc`: assets in `../data/site/net/dist`, `html_handling` `none` (`auto-trailing-slash` would bounce the rewritten `/index.html` back to `/`), `not_found_handling` `404-page` (the host's `404.html` for a missing file), `run_worker_first`.
- `edge.ts` ports the host's edge rules (`net/hosts/web/infra/edge.js` in the host): `net/redirects.json` as 301s, with or without the slash, a move's own query first; `www.` 301s to the https apex; `/raw/` passes; `/git/` serves `/index.html`; a last segment with a dot is a file; a bare last segment 301s to its slash form; a slash-ended path serves `/index.html`; a 301 keeps the query.
- `edge.ts` also serves `/raw/` as `text/plain` unless image, audio, video, font, pdf, wasm or archive, as the host's S3 types do, so a raw `.html` never renders.
- The redirects are baked in at deploy; unlike the host, a move whose target is no route still 301s.
- `ship.ts` writes `_headers`: today's headers, the CSP with `'wasm-unsafe-eval'` in `script-src` and `font-src 'self' data:`; `img-src` already allows `data:`.
- `edge.test.ts`: one test per rule, the host's edge cases, plus raw types and the headers: `bun test edge.test.ts`.
