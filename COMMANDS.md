## Commands

Run from `site/`, except `bun aws/site.ts`, which runs from the repo root.

- `bun run vendor` - vendor the font faces, the icon subset and their licences into `site/public/fonts/`; the work is `kit/vendor.ts` and the `fonts` block in `site/site.json` names the output folder, the Google families and axes, and the icon list.
- `bun run snapshot` - the live Shopify products into `data/carlomitchener/site/shop.json`, and the published feed index into `feed.json`.
- `bun run fake` - the same two files, invented, into `data/carlomitchener/site/dev/`: every catalog product with 6 to 10 variations, 60 posts, a pool of 50 to 100 picsum pictures; no Shopify, no S3.
- DEV mode: `"dev": true` in `site/package.json` (or `DEV=1`) makes `build` and `dev` read the `dev/` files, drop the Shopify cart and redirect `/cdn/` pictures to picsum; the knobs live in `site/src/config/dev.ts`; the Lambda ignores the flag.
- `bun run build` - render every page into `dist/`: the feed wall, the shop by category and product, one page per variation and one per post.
- `SITE_NOW=<epoch ms>` freezes `build`'s clock, so two runs of the same tree give byte-identical pages.
- `bun run test` - the `kit/` and `scripts/` tests; it rebuilds `dist/` with the real clock, so run it before a frozen build, never after. It names its two paths because `dist/git/` holds pages called `*.test.ts`; a bare `bun test` would try to run them.
- `bun run boot` - print every inline boot script as a JSON string; `build` refuses any inline script missing from that list.
- `bun run push` - upload what changed under `site/`, delete what went, never touch `cdn/`, `art/`, `automator/automator.json` or `stats/stats.json`.
- The `push` block in `site/site.json` is the whole rule: the prefix, that guard list, the bucket env key names, the manifest store and the immutable names; `kit/push.ts` reads it and `scripts/push.ts` is four lines.
- `bun run push --dry` lists every hashed path it would upload and counts the rest; `DRY=1 DRY_DIR=<dir>` holds the manifest in that folder instead of S3, so a push proves itself with no AWS at all.
- `/automator/` and `/stats/` are hidden pages; `src/components/Mirror.jsx` fetches `/automator/automator.json` and `/stats/stats.json` every minute, so they need no rebuild.
- `bun run dev` - build once, then serve `dist/` on port 3000, with `/cdn/feed/` served from `data/carlomitchener/feed/`; in DEV mode a missing post video is stood in by a local one.
- `/git/` is the code viewer from `kit/git/`: it browses this repo's own tracked tree, `/raw/` serves the bytes, and the `git` block in `site/site.json` names the root, the GitHub slug and the branch.
- That block also carries `"sitemap": false`, so the file pages and their `/raw/` objects stay off the map and only the `/git/` and `/git/<dir>/` listings enter it; the map stays about products.
- A code page carries no props box and no `props.json`, so nothing hydrates it: the chrome is static there and the 200 kB body is sent once, never twice.
- A repo binary the site already serves gets no `/raw/` twin: the bird pngs, the fonts and the kit's seti font are linked where they already live.
- `MRLY_GIT=0` skips rendering `/git/` and `/raw/` on `build` and `dev`, the knob mrly uses; the routes are still collected, and the manifest is `.cache/manifest-nogit.json` so the two modes never reap each other's files.
- `site/ui/tokens.css` maps the code kit's `--site-*` contract onto the shop's own roles, so the frames, the file lists and the image outlines take the shop's colours, hairline, radii, spacing and mono face; `site/ui/git.css` is the shop's frame for those pages.
- `bun run shots [routes]` - screenshots of the built `dist/`, which it serves itself, at phone, tablet and desktop, into `data/carlomitchener/site/scripts/shots/latest/`; console errors print under a shot and it flags any horizontal overflow.
- `SITE_URL=<origin>` shoots a live site instead of `dist/`, `<route>@<expr>` runs an expression before the shot, `--baseline` keeps a set to compare later runs against by hash.
- The `shots` block in `site/site.json` names the default routes and the three sizes; `kit/shots.ts` reads it and `scripts/shots.ts` is a handful of lines.
- `bun aws/site.ts` - the builder Lambda: commit, install, snapshot, build, push, head.
- The builder takes `{"source":"push|schedule|manual","repo":"carlomitchener/carlomitchener","sha":"..."}`; a sha counts only with that repo and only when GitHub's compare calls it an ancestor of main, else it polls main.
