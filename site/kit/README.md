# KIT

- This folder is stamped as-is into each site's `kit/`; a stamped copy is never edited, only its source.
- `ssg/` is the site builder: `build.ts` scans, fingerprints, renders and writes a site from its `site.json` and a spec; `links.ts` resolves every markdown link; `pic.ts` draws a dark and light picture pair.
- `ssg/md.ts` is the markdown pipeline: front matter, slugs, inline render, full render, sheet.
- `git/` is the code viewer, optional: a `git` block in `site.json` enables it, and only then must the site carry the Shiki packages `deps.json` lists for it.
- `lambda.ts` is the builder Lambda both sites run: the event, the head, the GitHub ancestor check and ETag poll, the `/opt/node` modules layer, the build and the push, over one config object a repo's thin `aws/*.ts` passes in.
- `stats/handler.py` is the 15-minute stats Lambda: CloudFront, Lambda and bucket numbers into one JSON key; its bucket, distribution, function names and key all come from the environment.
- `push.ts` ships a built site to its bucket by manifest diff: a `push` block in `site.json` names the prefix, the guarded paths, the bucket env keys, the manifest store and the immutable rule; `--dry` lists every hashed path and `DRY=1` holds the manifest on disk instead of S3.
- `palette.css` and `palette.js` are the fifteen generated colours, as CSS variables and as an object.
- `code/` is the code viewer's skin: `code.css`, the SETI icon font, and `contract.css` between them and a site.
- The kit's CSS reads only `--kit-*` names; `contract.css` gives each one a `--site-*` hook and a plain default.
- `theme.js` is the two role maps over them, `dark` and `light`.
- `deps.json` names, per module, the npm packages it imports and the range each site must carry.
- Every import between kit files is relative and stays inside the kit; nothing reaches out into a site.
- `bun test ./kit` from a site runs every test, each one beside the file it covers.
