# SHOP

- The Printful catalog, the automator Lambda that turns it into Shopify products, and the desk consoles.
- One design per round: every open product gets the same design, then the design rolls over and the round restarts.
- One product per tick: printfiles and labels on the CDN, Printful mockups, Shopify files, one Shopify product, Printful sync, publish.
- Every product lives one lunar month (29.53 days), then the reaper deletes it; a design's tiles go when its last product goes.
- `COMMANDS.md` lists the verbs.

## FOLDER

- `catalog/` - the Printful catalog into `files/products/<id>.json`; hand-kept `files/catalog.json` is the product list.
- `automator/` - the Lambda `carlomitchener-automator`: `run.py` is the loop, one file per step, `core/` holds config, clock, http, api, s3, status, models.
- `handler.py` - the Lambda entry; it re-exports `automator.run.handler`.
- `manager.py` - the automator console: init, show, design, status, paths, reset, abort, reap, redo, wipe.
- `shopify.py` - the shop console: publications, purge, vendor.
- `env.py` - `.env`, json, say, gate and verb for the desk scripts.
- `files/` - `catalog.json`, `dictionary.json`, `reviews.json`, `products/`. Kept forever.
- `theme/`, `mrlytheme.zip` - the Online Store theme; the site is headless, the theme only backs checkout.
- `automator` is a package of the workspace (`pyproject.toml`), so every step file runs from the desk: `uv run python carlomitchener/shop/automator/run.py` is one tick.

## STEPS

- Each tick loads `data/automator/task.json` or creates a task, then runs steps until one yields (`Retry`), fails, or completes.
- CREATE `create.py` - picks an open product in `paths.json`; when none is open, reopens all and rolls a new design; the task key is `{design}-{handle}`.
- GENERATE `generate.py` - renders the printfiles at the placement dpi, and once per design the tiles 1/3/5/7/9 and `og`.
- MOCKUP `mockup.py` - posts one v2 mockup task for the last variant with every mockup style and every placement, keeps the task id, yields.
- PROCESS `process.py` - polls the mockup task within `MOCKUP_BUDGET`; completed stores the mockup URLs; unknown styles are skipped; no mockup aborts.
- FILES `files.py` - `fileCreate` in batches of 25 from the Printful URLs, filename `{key}-{style}.png`, alt `{style} - {category} - {title}`; only missing files are resent, `FILE_ROUNDS` rounds.
- STATUS `status.py` - reads every file's status; FAILED or missing files go back to FILES; after the rounds they are dropped; not READY waits within `STATUS_BUDGET`.
- PRODUCT `product.py` - one `productSet` with `identifier: {handle}`, so a retry updates instead of duplicating; vendor Printful, tags Category, Title, `design:`, `group:`, `primary:`, `secondary:`; yields.
- PING `ping.py` - `GET sync/products/@{shopify id}` until Printful's app has pulled the product and every sku, within `PING_BUDGET`.
- SYNC `sync.py` - `PUT sync/variant/{id}` with the printfiles and the stitch colour, 30 variants per tick, stops before the tick reserve.
- PUBLISH `publish.py` - publishes to Online Store and Headless.
- COMPLETE `complete.py` - archives the task to `data/automator/tasks/<key>.json`, clears `task.json`, wakes `carlomitchener-site`; ARCHIVE reruns it if a tick died between the two.
- FAILED `run.py` - any other exception parks the task; the next tick sends it back to the failing step; three strikes abort. The counter resets whenever a step advances.
- REAP `reap.py` - before every task, the oldest archive past `LIVE_DAYS` (by S3 LastModified) loses its Shopify product, CDN folder and archive, then the site wakes.
- Abort deletes the Shopify product or its files and the CDN folder, clears the task and counts a strike in `strikes.json`; the product stays open, and at `MAX_STRIKES` (3) it is benched (`false`) for the rest of the batch. A new design resets the strikes. Only a missing catalog json quarantines (`null`).
- Every tick ends by writing `site/status/automator.json`: design, task, counters, paths, live count and the last 300 log lines. It is public.

## S3

- `data/automator/design.json` - the current design: key, seed, created_at, tiles, variation.
- `data/automator/task.json` - the task in flight, `{}` when idle.
- `data/automator/paths.json` - product id to `true` open, `false` used this round, `null` quarantined.
- `data/automator/strikes.json` - product id to aborts this batch.
- `data/automator/tasks/<key>.json` - one archive per live product.
- `data/catalog/<id>.json` - the parsed catalog, uploaded by `catalog/s3.py`.
- `site/cdn/printful/<design>/` - `tile-1.png` to `tile-9.png`, `og.png`.
- `site/cdn/printful/<design>-<handle>/` - `printfile.png` (or `-1`, `-2`).
- `site/status/automator.json` - the public status, `no-cache`. `site/status/stats.json` is `carlomitchener-stats`' every 15 minutes: CDN, Lambdas, errors, bucket counts. The site renders both at `/status/`.
- Nothing under `data/` is served; `site/` is the CloudFront origin.

## CONTEXT

- Prices: the variant price is Printful's cost. Shopify Markets adds the margin per market; the site reads market prices through the Storefront API with `@inContext(country)`.
- Vendor Printful on every automator product; `shopify.py purge` and `vendor` key on it, so paintings and prints can share the shop.
- Handle = `{design}-{handle}`, e.g. `08c92015-unisex-hoodie`. Variant sku = `{handle}-{size slug}`. Mockup file = `{handle}-{style}.png`; the style id also leads the alt, and the site's flip keys on the alt (`lib/shop.ts styleOf`, `client/flip.ts`).
- The site takes the design key from the handle and reads group, primary and secondary from the archived task (`scripts/snapshot.ts`).
- The design paints White (`PRIMARIES` in `core/config.py`): AOP prints on white fabric, so white areas never show as bleed when stretched. The `primaries` column in `catalog.json` is informational.
- Stitch colour: the design's primary when the blank offers it, else Clear, else the first offered. Bags offer Black and Clear only.
- Labels: none. The four `label_*` placements are ignored in `catalog/correct.py`; a label file shows up in the mockups, so Carlo scrapped them (2026-09-17). `label_panel` is a print panel, not a label.
- The task json holds no secret: ids, costs, CDN URLs, the variation and counters. The status file carries none of the costs or Printful URLs.
- The site rebuilds when woken: COMPLETE, REAP and a new feed post invoke `carlomitchener-site` with `{"source": "manual"}`; it rebuilds only if the Shopify snapshot or the feed index changed.
- `Retry` ends the tick and saves; `TaskAborted` aborts; anything else is a strike. Printful 429, 5xx after backoff and network errors retry; 400 and 404 abort; Shopify THROTTLED retries.
- Budgets in `core/config.py`: mockup 30 min, status 20 min, ping 60 min, 3 file rounds, 3 renders, 3 strikes, 25 s tick reserve.
- `requests` is not needed: `core/http.py` is a small shim with backoff and `Retry-After`.
- Secrets live in `Developer/.env` on the desk and in the Lambda env in the cloud; the row is `carlomitchener-automator` in `aws/common.py`.
