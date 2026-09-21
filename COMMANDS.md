## Commands

Run from `site/`, except `bun aws/site.ts`, which runs from the repo root.

- `bun run vendor` - vendor the font faces, the icon subset and their licences into `site/public/fonts/`.
- `bun run snapshot` - the live Shopify products into `data/carlomitchener/site/shop.json`, and the published feed index into `feed.json`.
- `bun run fake` - the same two files, invented, into `data/carlomitchener/site/dev/`: every catalog product with 6 to 10 variations, 60 posts, a pool of 50 to 100 picsum pictures; no Shopify, no S3.
- DEV mode: `"dev": true` in `site/package.json` (or `DEV=1`) makes `build` and `dev` read the `dev/` files, drop the Shopify cart and redirect `/cdn/` pictures to picsum; the knobs live in `site/src/config/dev.ts`; the Lambda ignores the flag.
- `bun run build` - render every page into `dist/`: the feed wall, the shop by category and product, one page per variation and one per post.
- `SITE_NOW=<epoch ms>` freezes `build`'s clock, so two runs of the same tree give byte-identical pages.
- `bun run test` - the `kit/` and `scripts/` tests; it rebuilds `dist/` with the real clock, so run it before a frozen build, never after.
- `bun run boot` - print every inline boot script as a JSON string; `build` refuses any inline script missing from that list.
- `bun run push` - upload what changed under `site/`, delete what went, never touch `cdn/`, `art/`, `automator/automator.json` or `stats/stats.json`.
- The `push` block in `site/site.json` is the whole rule: the prefix, that guard list, the bucket env key names, the manifest store and the immutable names; `kit/push.ts` reads it and `scripts/push.ts` is four lines.
- `bun run push --dry` lists every hashed path it would upload and counts the rest; `DRY=1 DRY_DIR=<dir>` holds the manifest in that folder instead of S3, so a push proves itself with no AWS at all.
- `/automator/` and `/stats/` are hidden pages; `src/components/Mirror.jsx` fetches `/automator/automator.json` and `/stats/stats.json` every minute, so they need no rebuild.
- `bun run dev` - build once, then serve `dist/` on port 3000, with `/cdn/feed/` served from `data/carlomitchener/feed/`; in DEV mode a missing post video is stood in by a local one.
- `bun run shots [routes]` - screenshots of the dev server at 390, 834 and 1440, light and dark, into `data/carlomitchener/site/shots/`; flags any horizontal overflow.
- `bun aws/site.ts` - the builder Lambda: commit, install, snapshot, build, push, head.
- The builder takes `{"source":"push|schedule|manual","repo":"carlomitchener/carlomitchener","sha":"..."}`; a sha counts only with that repo and only when GitHub's compare calls it an ancestor of main, else it polls main.
