## Commands

Run from `site/`, except `bun aws/site.ts`, which runs from the repo root.

- `bun run vendor` - vendor the fonts, the icons and TheBird marks into `site/public/`.
- `bun run snapshot` - the live Shopify products into `data/carlomitchener/site/shop.json`, and the published feed index into `feed.json`.
- `bun run fake` - the same two files, invented, into `data/carlomitchener/site/dev/`: every catalog product with 6 to 10 variations, 60 posts, a pool of 50 to 100 picsum pictures; no Shopify, no S3.
- DEV mode: `"dev": true` in `site/package.json` (or `DEV=1`) makes `build` and `dev` read the `dev/` files, drop the Shopify cart and redirect `/cdn/` pictures to picsum; the knobs live in `site/src/config/dev.ts`; the Lambda ignores the flag.
- `bun run build` - render every page into `dist/`: the feed wall, the shop by category and product, one page per variation and one per post.
- `bun run push` - upload what changed, delete what went, never touch `cdn/`, `art/`, `status/automator.json` or `status/stats.json`.
- `/status/` is a hidden page; `client/status.ts` fetches `/status/automator.json` and `/status/stats.json` every minute, so it needs no rebuild.
- `bun run dev` - build once, then serve `dist/` on port 3000, with `/cdn/feed/` served from `data/carlomitchener/feed/`; in DEV mode a missing post video is stood in by a local one.
- `bun run shots [routes]` - screenshots of the dev server at 390, 834 and 1440, light and dark, into `data/carlomitchener/site/shots/`; flags any horizontal overflow.
- `bun aws/site.ts` - the builder Lambda: commit, install, snapshot, build, push, head.
- The builder takes `{"source":"push|schedule|manual","sha":"..."}` and rebuilds when the sha moved or the snapshot changed.
