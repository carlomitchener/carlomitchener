## Commands

- Run any file with the VS Code Play button, or by path from `Developer/`: `uv run python carlomitchener/shop/catalog/main.py`.
- The block at the bottom of each file lists its steps; comment out what you don't want.
- Secrets come from `Developer/.env`: `PRINTFUL_API_KEY`, `CARLOMITCHENER_BUCKET`.

## Catalog

- `files/catalog.json` is the hand-kept product list: id, category, title, technique, link, handle, primaries. Every row is live.
- `files/products/<id>.json` is the parsed product. `files/dictionary.json` maps id to "category, title, technique".
- `catalog/main.py` - the whole pipeline: sort, dictionary, check, fetch, parse, sort sizes, correct, check, upload.
- `catalog/fetch.py` - Printful raw data into `data/carlomitchener/shop/catalog/raw/`; skips products already fetched. `raw/catalog.json` is the whole Printful catalog as `id: "title - technique"`, discontinued dropped, with product counts per technique in `raw/stats.json`; `new_products()` prints the All-Over Print ones missing from `catalog.json`.
- `catalog/parse.py` - raw data into `files/products/`.
- `catalog/sort.py` - variants by size.
- `catalog/correct.py` - fixes dims and ignores placements, variants and mockups; the tables sit at the top of the file.
- `catalog/check.py` - every catalog row is current and cut-sew; every product has one colour, a placement and a mockup.
- `catalog/list.py` - unique values and averages across products.
- `catalog/filter.py` - the catalog philosophy as code: cut-sew, made in the EU and US, worn or carried, and a men's/women's or kids/youth twin; prints what it keeps and the diff against `catalog.json`. Not part of the pipeline.
- `catalog/reviews.py` - scrapes printful.com for the rating and review count of every cut-sew and direct-to-fabric product into `files/reviews.json`; flags moved and missing pages. Not part of the pipeline.
- `catalog/s3.py` - upload products to `$CARLOMITCHENER_BUCKET/data/products/`; `delete_products()` wipes them.
- `catalog/helpers.py` - sort `catalog.json` alphabetically and write `dictionary.json`.

## Shopify

- `manager.py <verb>` - verbs: init, show, paths, reset, abort, reap, wipe.
- `shopify.py <verb>` - verbs: publications, purge, vendor.
