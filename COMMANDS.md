## Commands

Run from `site/`, except `bun aws/site.ts`, which runs from the repo root.

- `bun run vendor` - vendor the fonts, the icons and TheBird marks into `site/public/`.
- `bun run snapshot` - the live Shopify products into `data/carlomitchener/site/shop.json`, and the published game index into `game.json`.
- `bun run fake` - the same two files, invented, so the site builds with no shop and no games.
- `bun run build` - render every page into `dist/`: the game wall, the shop by category and product, one page per variation and one per game.
- `bun run push` - upload what changed, delete what went, never touch `cdn/` or `art/`.
- `bun run dev` - build once, then serve `dist/` on port 3000, with `/cdn/game/` served from `data/carlomitchener/game/`.
- `bun run shots [routes]` - screenshots of the dev server at 390, 834 and 1440, light and dark, into `data/carlomitchener/site/shots/`; flags any horizontal overflow.
- `bun aws/site.ts` - the builder Lambda: commit, install, snapshot, build, push, head.
- The builder takes `{"source":"push|schedule|manual","sha":"..."}` and rebuilds when the sha moved or the snapshot changed.
