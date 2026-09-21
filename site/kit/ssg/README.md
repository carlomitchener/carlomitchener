# ssg

- The site builder both sites run, stamped from the kit. One function renders one route; the rest is bookkeeping.
- Generic: it knows routes, inputs, bundles, fingerprints and manifests, never markdown, papers or products.
- The site brings its `site.json`, a `collect()` that lists routes and a `render()` per route.
- `md.ts` is the markdown pipeline: `render(md, { link, math, widget })`, `inline`, `sheet`, `front`, `title`, `summary`, `plain`, `slug`, `escape`.
- `links.ts` is the one link resolver and `pic.ts` draws a dark and light `<picture>` pair.
- The one dispatch is `../git`: a `git` block in `site.json` makes `scan` append the repo's own `/git/` and `/raw/` routes, and `render` and `fingerprint` dispatch to that module; no block, nothing git-related runs.

## SITE.JSON

- `title` (or `name`) and `root`, then whatever the site's own chrome reads.
- `inputs`: `{ name: { path, ext?, deep? } }`. Declared, never assumed. `site.input(name).files` reads them back.
- The site resolves nothing by hand: an undeclared name throws, so every path a build reads is in one block.
- `kit`: `{ path, out, hash, files, ext }`, one bundle copied into `out/`; `site.asset(name)` gives the href, hashed when `hash` is true.
- A hashed `.js` file has every relative `import` and `import()` of another listed file rewritten to that file's hashed href, and a hashed `.css` file the same for every `url()` and `@import`, dependencies first, so the kit needs no bundler.
- A cycle throws, and naming a file the bundle does not list throws unless an earlier bundle already placed it, which answers with that file's hashed href.
- `assets`: more bundles of the same shape, for files that must keep their names, such as `fonts/` and `seti/`, whose CSS names its faces by relative url.
- `manifest`: the webmanifest, written as is. `robots`: `{ disallow }`, appended to the wildcard block alone.
- `llms`: `{ about, links }`, optional. `about` is the paragraph llms.txt opens on; a link is `{ href, name, note }` and is dropped unless the site publishes that route. No block, no `llms.txt`.

## EXPORTS

- `scan(spec)`: runs `prepare`, reads `site.json` and the declared inputs, places every bundle, calls `collect()`, returns `Site`.
- `Site`: `root out config inputs kit routes nav stamp index copies styles serves made asset input bytes`.
- `copies` are the placed bundle files, which `globals` writes; `styles` is every placed `.css` href, sorted, for a chrome that links them all.
- `serves` maps a bundled source file to its href and `made` holds every path the build has written; the code viewer's `served` hook reads both.
- `render(site, route, spec)`: pure, returns `[{ path, bytes, type? }]` for that route alone. A missing input throws here.
- `type` overrides the content type a path would earn by its extension; it rides in the manifest so a push sets the S3 header without re-rendering.
- `globals(site, spec)`: the copies, sitemap.xml, robots.txt, llms.txt, the webmanifest, the icons, `git/tree.json`, the public copy, then the site's own extras.
- robots.txt allows everything: an `Allow: /` block per named crawler (GPTBot, ClaudeBot, Claude-Web, CCBot, Google-Extended, anthropic-ai, PerplexityBot), then `*`, then the sitemap line.
- sitemap.xml is one `<url>` per entry in every route's `urls`, `lastmod` from the route's `at`, so a group route fills the map with the pages it publishes.
- llms.txt is the title, the site root, the `about` paragraph and the declared links; nothing is listed by accident and no route writes itself in.
- `fingerprint(site, route, spec?)`: sha256 of the route's input bytes, its data, the templates, the navigator and the link index. Never a date, never an absolute path.
- A file is named by its declaration, `research/foo.md`, not by where the tree sits; an undeclared file is named by its basename, a directory hashes every inner path and byte relative to itself.
- So a checkout, a tarball and a lambda fingerprint the same bytes the same way, and one manifest serves them all.
- `build(spec, { manifest, force, verify })`: scan, fingerprint, render only what changed, write only bytes that differ.
- Then it drops the outputs of dead routes, prunes every folder that empties, and sweeps each bundle's `out/` of any file this build did not write.
- `verify` is on by default and re-renders a route whose outputs went missing from `out/`; a build against a remote manifest turns it off, because there the disk is a scratch pad.
- `walk bytes forget digest short escape page today guard label jsonText jsonScript`: the small helpers a site would write twice. `forget()` drops the byte cache, which a watcher calls before it rescans.

## SPEC

- `root out config templates prepare collect render globals inline icons git asset`.
- `templates` are the dirs whose bytes rebuild every route; the kit itself is always one, so a kit edit re-renders everything.
- `prepare` runs first, before the scan reads anything, for a site that bundles its client and then lists the bundle as an asset.
- `collect(site)` returns `{ routes, nav? }`; `nav` is the site tree the chrome draws and the code viewer's node joins it when the site has not placed one.
- `inline` lists every inline script a page may carry; `build` refuses a page carrying one it does not know.
- `icons`: `{ rows, svg }`, a square glyph grid of `0`/`1` strings and the favicon svg; the builder writes the svg as `favicon.svg` and draws `favicon.png`, `apple-touch-icon.png`, `icon-192.png` and `icon-512.png` from the grid. No field, no icons.
- `git` is the code viewer's hooks, `{ page, md, code, served }`: the chrome, the markdown pipeline, the highlighter and the mirror seam the module cannot know by itself.
- `asset(name, body)` may rewrite a bundle file's bytes before it is hashed and placed.
- `Route`: `{ route, kind, name, data, source, inputs, urls, at, hidden, sitemap }`.
- `hidden` keeps a route out of the navigator and out of every list a reader browses; `sitemap` puts it back on the map anyway.
- The code viewer sets both, so a thousand pages the tree never shows are still crawlable; `/404.html` sets only `hidden` and stays off.
- One route may be a group: `urls` lists the pages it publishes, so a bundler route and a code page still fill the sitemap.
- `render` may be async, so a route can run a bundler and hand back its bytes before anything is written.
- The manifest is `{ route: { hash, at, outputs, types? } }` and lives wherever the caller points it.
- `at` is the route's own date, else the manifest's while the hash holds, else today, so a tree with no git keeps the dates it was given.

## LINKS

- `resolve(site, from, url)` in `links.ts` is the one resolver: every markdown render sends its links through it, and `from` is the file the link is written in, absolute or relative to the repo root.
- `https:`, `http:`, `mailto:`, `tel:`, a bare `#fragment` and a rooted `/path` pass through untouched; everything else is a path.
- The path resolves against the directory of `from`, and its `#fragment` or `?query` is set aside and put back on whatever the resolver answers.
- `scan()` builds the index once per build: every route's `source`, and every `source` a route names in its `urls`, mapped to that route under both its absolute path and its declared name, so `research/core.md` and `demos/spin` are keys as much as the full paths are.
- A route that wants to be found by a link names the input it publishes in `source`; a group route names one per page in `urls`, which is how a shelf hands each folder its own route.
- The index is asked first, for the path, the path plus `.md` and the path with `.md` stripped, so `bases.md`, `bases` and `../demos/spin/` all land on the route the site publishes.
- A miss falls to the repo: `/raw/<path>` for an image or a PDF, `/git/<path>` for a file, `/git/<path>/` for a directory, and only when the code viewer carries that route.
- A site with git routes but no slug stops there; a site with no git routes falls to `https://github.com/<slug>/blob/<branch>/<path>` when `site.json` names one, and a site with no git block leaves the link as written.
- Anything else is left exactly as written: a target outside the repo, a paper fetched from another tree, a path nothing publishes.
- `stamp(index)` is the index as one string, keyed relative to the repo root, and it rides in every fingerprint, so a page re-renders when a route it could link to appears, renames or disappears.
- So the resolver never asks which page is doing the reading, only which file the link was written in, and one README answers the same under `/git/` and under `/research/`.
