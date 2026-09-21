# KIT

- This folder is stamped as-is into each site's `kit/`; a stamped copy is never edited, only its source.
- `ssg/` is the site builder: `build.ts` scans, fingerprints, renders and writes a site from its `site.json` and a spec; `links.ts` resolves every markdown link; `pic.ts` draws a dark and light picture pair.
- `ssg/md.ts` is the markdown pipeline: front matter, slugs, inline render, full render, sheet.
- `git/` is the code viewer, optional: a `git` block in `site.json` enables it, and only then must the site carry the Shiki packages `deps.json` lists for it.
- `lambda.ts` is the builder Lambda both sites run: the event, the head, the GitHub ancestor check and ETag poll, the `/opt/node` modules layer, the build and the push, over one config object a repo's thin `aws/*.ts` passes in.
- `stats/handler.py` is the 15-minute stats Lambda both sites run: CloudFront, Lambda and bucket numbers into one JSON key, and it names no site of its own.
- It reads only `STATS_BUCKET`, `STATS_DISTRIBUTION` (empty means no cdn block), `STATS_FUNCTIONS`, `STATS_KEY` and three `label=prefix` count lists: `STATS_SIZES` (`<label>_objects` and `<label>_bytes`), `STATS_COUNTS` (objects under a prefix) and `STATS_FOLDERS` (immediate subfolders, narrowed by an optional regex third field).
- `push.ts` ships a built site to its bucket by manifest diff: a `push` block in `site.json` names the prefix, the guarded paths, the bucket env keys, the manifest store and the immutable rule; `--dry` lists every hashed path and `DRY=1` holds the manifest on disk instead of S3.
- `shots.ts` is the screenshot driver: a `shots` block in `site.json` names the default routes and the sizes, it serves the built `dist/` itself, drives one headless Chrome on one port with one throwaway profile, and writes into `data/<repo>/site/scripts/shots/{latest,baseline}`.
- `vendor.ts` writes a site's font folder: a `fonts` block in `site.json` names the output folder, the Google families and their axes, the optional icon subset, and a `keep` css of the faces the site cuts itself, which it copies verbatim into `fonts.css` under the vendored ones.
- `palette.css` is the fifteen generated colours as CSS variables, at the kit root because a site's stylesheet loads it first.
- `code/` is the code viewer's skin: `code.css`, the SETI icon font, and `contract.css` between them and a site.
- The kit's CSS reads only `--kit-*` names; `contract.css` gives each one a `--site-*` hook and a plain default.
- `theme/` is the same colours in JS: `palette.js` the fifteen as an object, `theme.js` the two role maps over them, `dark` and `light`.
- `font/` is the pixel font that writes a wordmark: `font.js` lays out, writes, folds and plays a text, `font.json` the glyph book the `mrlyfont` crate generates.
- `deps.json` names, per module, the npm packages it imports and the range each site must carry.
- Every import between kit files is relative and stays inside the kit; nothing reaches out into a site.
- `bun test ./kit` from a site runs every test, each one beside the file it covers.
