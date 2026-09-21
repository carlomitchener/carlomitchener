# KIT

- This folder is stamped as-is into each site's `kit/`; a stamped copy is never edited, only its source.
- `ssg/md.ts` is the markdown pipeline: front matter, slugs, inline render, full render, sheet.
- `palette.css` and `palette.js` are the fifteen generated colours, as CSS variables and as an object.
- `theme.js` is the two role maps over them, `dark` and `light`.
- `deps.json` names, per module, the npm packages it imports and the range each site must carry.
- Every import between kit files is relative and stays inside the kit; nothing reaches out into a site.
- `bun test ./kit` from a site runs every test, each one beside the file it covers.
