# SITE

- carlomitchener.com: the avatar sky as the first screen, then the repo's `README.md` as a plain page, served by a Cloudflare Worker.
- Run from the repo root: `bun run --cwd site <script>`.

## SCRIPTS

- `build` - `build.ts` renders `../README.md` with `Bun.markdown.html` into `dist/index.html`, points relative links at GitHub (`tree` for a folder, `blob` for a file), and writes `404.html`, `site.css`, `sky.js`, the favicons and `_headers`.
- `dev` - `dev.ts` builds, serves `dist/` on port 3000 (`PORT` picks another) with the same headers, less `upgrade-insecure-requests`, which would send Safari to `https://127.0.0.1`, and rebuilds on any edit to `README.md`, `avatar/`, `site/src/` or `site/public/`; Ctrl-C stops it.
- `shots` - builds, then `shots.ts` serves `dist/` on 3336 and drives one headless Chrome on 9336 with one profile: `/`, `/?at=1.2` and `/404.html` (add `/?splash=off` for the static path) at phone, tablet and desktop, light and dark, into `data/site/shots/`; it prints console errors and overflow, then kills Chrome. Routes as arguments narrow it.
- On `/` it shoots the splash at rest, holds the pointer to unlock it, waits for `splashdone`, checks the wheel scrolls, shoots the fade and the page, checks the sky paused and the fog is on, then taps the sky from mid-scroll and checks the splash relocks at the top. Chrome runs on the Metal GPU (`--use-angle=metal`): under swiftshader one fling takes 40 to 60 s.
- `deploy` - build, then `wrangler deploy`.

## PIECES

- `sky.js` is `avatar/` bird, avatar, sky-core, sky-mood, sky-clouds, sky-light, sky-weather, sky-bird and sky, then `src/mount.js`, then `avatar/splash.js`, joined in `data/site/sky.js` and bundled as one IIFE, so they share one scope.
- The sky is the first section, `100lvh` tall in normal flow, so it fills the screen behind iOS's floating toolbar; the README follows as an ordinary page, and `.fog`, a fixed top gradient in the page colour, fades the text as it scrolls past the top.
- `src/mount.js` turns off scroll restoration and starts at the top unless the URL has a `#hash`, so a reload never opens the splash over the README; it ties the sky's opacity to scroll, fully faded at 80% of its height, melts its bottom edge into the page through `--melt` as soon as it leaves the top, and the fog's to the inverse, so the fog is off at the top and fully on once the sky is gone; it pauses the sky once faded, hidden or under reduced motion, and `G.visible` follows. While `html.splashing` is set it leaves the sky alone, which covers `splashlock` too, since the splash sets the class before firing it; `splashdone` runs `fade()` once.
- Nothing covers the sky canvas but the open `#splash`, `.fog` and the `.sky::after` melt, all `pointer-events: none`, so a tap on the sky reaches it from any scroll position and replays the splash. No `overscroll-behavior` anywhere, so pull-to-refresh, which replays the splash too, keeps working.
- `#splash` is on the home page only, a direct child of `body`; `avatar/splash.css` joins `site.css` and makes it a fixed full-screen overlay at z-index 10, transparent once open, and a `<noscript>` style hides it without JavaScript.
- `worker.ts` 301s `www.` to the apex and hands everything else to `ASSETS`; `run_worker_first` lets it see every request, and `_headers` still applies through `env.ASSETS.fetch`.
- `_headers`: HSTS with preload, nosniff, referrer, permissions-policy, COOP, and a CSP with `script-src 'self'` and no inline script; `style-src` keeps `'unsafe-inline'` for the `<noscript>` style, and `img-src` allows `data:` for the splash's SVG glow mask.
- `public/bird/` is `avatar/bird.py`'s output; the build copies `bird-32.png`, `bird-192.png` and `square-180.png`.
