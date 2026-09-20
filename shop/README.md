# SHOP

- The Printful catalog, the automator Lambda that turns it into Shopify products, and the desk consoles.
- One design per batch: every catalog product gets the design twice, light (White primary) and dark (Black primary), as two Shopify products.
- One product per tick: printfiles on the CDN, Printful mockups, Shopify files, one Shopify product, Printful sync, publish.
- The site shows a batch only once every cell is used or dropped and the batch is released; a batch lives one lunar month (29.53 days) from its release, then the reaper deletes it whole.
- `COMMANDS.md` lists the verbs.

## FOLDER

- `catalog/` - the Printful catalog into `files/products/<id>.json`; hand-kept `files/catalog.json` is the product list.
- `automator/` - the Lambda `carlomitchener-automator`: `run.py` is the loop, one file per step, `release.py` closes a batch, `core/` holds config, clock, http, api, s3, status, models.
- `handler.py` - the Lambda entry; it re-exports `automator.run.handler`.
- `manager.py` - the automator console: init, show, batch, status, rows, reset, abort, reap, redo, release, wipe.
- `shopify.py` - the shop console: publications, purge, vendor. Purge and vendor touch only automator products (handle `{dark|light}-...-{8 hex}`, or the old `{8 hex}-...` until the cutover purge, productType in `catalog.json`) and print every other product as skipped, so the gift cards stay.
- `theme.py` - the theme console: list, push, publish. The theme lives in `theme/` as plain files; no zip, no CLI. It is already the live theme, so `push --yes` edits the storefront directly.
- `env.py` - `.env`, json, say, gate and verb for the desk scripts.
- `files/` - `catalog.json`, `dictionary.json`, `reviews.json`, `products/`. Kept forever.
- `theme/`, `theme.zip` - the Online Store theme; the site is headless, the theme only backs checkout. Rebuild with `(cd carlomitchener/shop/theme && zip -X -D -r -FS ../theme.zip .)`, upload by hand in Shopify admin.
- `automator` is a package of the workspace (`pyproject.toml`), so every step file runs from the desk: `uv run python carlomitchener/shop/automator/run.py` is one tick.

## STEPS

- Each tick loads `data/automator/task.json` or creates a task, then runs steps until one yields (`Retry`), fails, or completes.
- CREATE `create.py` - loads `batch.json` or rolls one: a design plus one row per `data/catalog/` product with a light and a dark cell. When the batch has no open cell it is released first. The next cell is the open half of a half-used row, else a random fresh row, light first; the task key is `{primary}-{handle}-{design}`.
- GENERATE `generate.py` - rebuilds the design at the batch seed with the task's primary ink (`PRIMARIES` in `core/config.py`, light White, dark Black), renders the printfiles at the placement dpi, and once per primary per design the tiles `{primary}-tile-{1,3,5,7,9}`. Same seed, same geometry: the dark render is the light render with black and white swapped, every other ink stays.
- MOCKUP `mockup.py` - keeps the styles the last variant allows and posts the first v2 mockup tasks: `MOCKUP_RENDERS` renders (styles x placements) per task, `MOCKUP_INFLIGHT` tasks in flight, `MOCKUP_POSTS` posts per tick (the store's limit is 2 a minute); every placement rides on every task; a mockup's `job` is its task id, its `url` arrives later, like `variant.synced`.
- PROCESS `process.py` - one GET polls every task in flight; completed stores the URLs and drops styles that came back empty; failed clears the `job` so those styles get reposted and counts a failure on each, `MOCKUP_ROUNDS` failures drop the style; then it tops up the tasks in flight and waits within `MOCKUP_BUDGET`; no style left aborts. Printful 500s about 4 in 10 of the track jacket's tasks (6 placements of 44x46 in) whatever their size, so the retries carry it.
- FILES `files.py` - `fileCreate` in batches of 25 from the Printful URLs, filename `{key}-{style}.png`, alt `{style} - {category} - {title}`; only missing files are resent, `FILE_ROUNDS` rounds.
- STATUS `status.py` - reads every file's status; FAILED or missing files go back to FILES; after the rounds they are dropped; not READY waits within `STATUS_BUDGET`.
- PRODUCT `product.py` - one `productSet` with `identifier: {handle}`, so a retry updates instead of duplicating; title `{Light|Dark} {Title} ({design})`, vendor Printful, tags Category, Title, `design:`, `group:`, `primary:` (the ink, White or Black), `secondary:`; yields.
- PING `ping.py` - `GET sync/products/@{shopify id}` until Printful's app has pulled the product and every sku, within `PING_BUDGET`.
- SYNC `sync.py` - `PUT sync/variant/{id}` with the printfiles and the stitch colour, `SYNC_BATCH` 9 variants per tick because Printful allows 10 variant syncs a minute, stops before the tick reserve.
- PUBLISH `publish.py` - publishes to Online Store and Headless.
- COMPLETE `complete.py` - archives the task to `data/automator/tasks/<key>.json`, clears `task.json` and wakes the site, which shows the product on `/status/` and at its own URL as a preview, nothing buyable, until the batch is released; ARCHIVE reruns it if a tick died between the two.
- RELEASE `release.py` - when CREATE finds no open cell: stamps `released_at`, moves `batch.json` to `batches/{design}.json`, wakes `carlomitchener-site` once, and CREATE rolls the next batch. Design GIFs may join here later.
- FAILED `run.py` - any other exception parks the task; the next tick sends it back to the failing step; three strikes abort. The counter resets whenever a step advances.
- REAP `reap.py` - before every task, the oldest released batch past `LIVE_DAYS` loses every product (archives ending `-{design}.json`: Shopify product, CDN folder, archive), then the design folder and the batch file, then the site wakes. It stops at `REAP_RESERVE` seconds left and resumes next tick; a productDelete Shopify refuses is logged and skipped.
- Abort deletes the Shopify product or its files and the CDN folder, clears the task and counts a strike in `strikes.json`; the cell reopens, and at `MAX_STRIKES` (3) the pair drops: both cells `dropped`, and the sibling already made is removed. A new batch resets the strikes. A missing catalog json drops the pair too.
- Every tick ends by writing `site/status/automator.json`: design, batch (open, used, dropped, tiles, strikes), task, live (products, batches, expiring) and the last 300 log lines. It is public.

## S3

- `data/automator/batch.json` - the batch in flight: design, seed, created_at, variation, tiles per primary, rows (product id to `{light, dark}` cells, each `open`, `used` or `dropped`).
- `data/automator/batches/<design>.json` - one file per released batch, `released_at` set; the site and the reaper read this folder.
- `data/automator/task.json` - the task in flight, `{}` when idle.
- `data/automator/strikes.json` - product id to aborts this batch.
- `data/automator/tasks/<key>.json` - one archive per live product.
- `data/catalog/<id>.json` - the parsed catalog, uploaded by `catalog/s3.py`; its ids are the rows of every new batch.
- `site/cdn/printful/<design>/` - `light-tile-1.png` to `dark-tile-9.png`.
- `site/cdn/printful/<primary>-<handle>-<design>/` - `printfile.png` (or `-1`, `-2`).
- `site/status/automator.json` - the public status, `no-cache`. `site/status/stats.json` is `carlomitchener-stats`' every 15 minutes: CDN, Lambdas, errors, bucket counts. The site renders both at `/status/`.
- Nothing under `data/` is served; `site/` is the CloudFront origin.

## CONTEXT

- Prices: the variant price is Printful's cost. Shopify Markets adds the margin per market; the site reads market prices through the Storefront API with `@inContext(country)`.
- Vendor Printful on every automator product; `shopify.py purge` and `vendor` key on it and on the automator handle shape, so gift cards, paintings and prints can share the shop.
- Theme: `layout/theme.liquid` redirects every page to the site with a meta refresh and `location.replace`, the visible link stays for no-JS; `snippets/target.liquid` picks the target per template: product `/shop/{slug}/{design}/` from the handle's last segment (a handle without an 8-hex design goes to `/`), collection, search and list-collections `/shop/`, cart `/cart/`, page `/shop/{handle}/` for shipping, faq and terms and `/{handle}/` for the rest, everything else `/`. `password` never redirects. `templates/gift_card.liquid` is `layout none` and never redirects: Shopify renders the card a buyer receives from it (code, value, balance, expiry, print).
- Shopify title = `{Light|Dark} {title} ({design})`, e.g. `Dark Tote Bag (08c92015)`, so cart lines and emails tell variations apart; the site reads its titles from `catalog.json`, never from Shopify.
- Handle = `{primary}-{handle}-{design}`, e.g. `light-unisex-hoodie-08c92015`. Variant sku = `{handle}-{size slug}`. Mockup file = `{handle}-{style}.png`; the style id also leads the alt, and the site's flip keys on the alt (`lib/shop.ts styleOf`, `client/flip.ts`).
- The site takes the primary and the design from the handle, reads group and secondary from the archived task, and the release date from `batches/` (`scripts/snapshot.ts`). The two products of a design render as one page at `/shop/{slug}/{design}/`: the default follows the site mode, a pill swaps them, and every grid shows the sibling matching the mode. Products without a released batch are pending: they never enter the shop, home, search or sitemap, but `/status/` lists them and their pages exist with Add to Bag and Buy now disabled; a lone sibling stands in for the missing one.
- Vocabulary: light and dark, or white and black, are the primary; never shade. The `primaries` column in `catalog.json` is informational; every row gets both.
- Stitch colour: the design's primary when the blank offers it, else Clear, else the first offered. Bags offer Black and Clear only.
- Labels: none. The four `label_*` placements are ignored in `catalog/correct.py`; a label file shows up in the mockups, so Carlo scrapped them (2026-09-17). `label_panel` is a print panel, not a label.
- The task json holds no secret: ids, costs, CDN URLs, the variation and counters. The status file carries none of the costs or Printful URLs.
- The site rebuilds when woken: RELEASE, REAP and a new feed post invoke `carlomitchener-site` with `{"source": "manual"}`; it rebuilds only if the Shopify snapshot or the feed index changed.
- `Retry` ends the tick and saves; `TaskAborted` aborts; anything else is a strike. Printful 429, 5xx after backoff and network errors retry; 400 and 404 abort; Shopify THROTTLED retries.
- Printful rate limits, the two walls the pace is built on: 2 mockup requests a minute per store, `MOCKUP_POSTS` caps at 1; 10 variant syncs a minute, `SYNC_BATCH` caps at 9. Both live in `core/config.py`; a 429 past either retries next tick.
- Budgets in `core/config.py`: mockup 30 min and 12 renders per task, status 20 min, ping 60 min, 3 file rounds, 3 renders, 3 strikes, 25 s tick reserve, 60 s reap reserve.
- `requests` is not needed: `core/http.py` is a small shim with backoff and `Retry-After`.
- Secrets live in `Developer/.env` on the desk and in the Lambda env in the cloud; the row is `carlomitchener-automator` in `aws/common.py`.
