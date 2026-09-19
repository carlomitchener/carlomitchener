# AVATAR

- `bird.json` is the source of truth. Every image is a rendering of it.
- `bird.js` is generated from it plus the palette by `build.py`. Never edit by hand.
- `avatar.js` renders the recipe as SVG DOM, deforms the outline, exports SVG and PNG.
- `avatar.html` is the editor: theme, layers, glow, gradient, fringe, export, header hover demo.
- `sky.html` is the screensaver prototype: look up, painted clouds on a gusty wind, sun or moon, the bird soars, climbs, dives.
- `render.py` renders the recipe headless to PNG and SVG in `data/carlomitchener/avatar/`.
- `bird.py` still cuts favicons and wallpapers from `files/TheBird-Official.png`.

## RUN

- `uv run python carlomitchener/avatar/build.py` after editing `bird.json`.
- `uv run python carlomitchener/avatar/render.py --size 1000 --theme dark --svg`
- `uv run python carlomitchener/avatar/render.py --layers fringe,bird --crop --svg --name sticker`
- Open the HTML files straight from disk. No server, no build.
- Snapshot: `bun carlomitchener/avatar/snap.ts "file:///$PWD/carlomitchener/avatar/sky.html?theme=light&jump=8&pause=1" data/carlomitchener/avatar/sky.png` (optional width height). Prints page errors.
- `sky.html` takes `?theme=dark`, `&jump=8` (seconds to skip), `&dive=0.7` (start a dive, then skip), `&pause=1` (freeze). Keys: `d` theme, `v` dive.

## RECIPE

- Canvas: 5000 units. Angles: 0 = East, 90 = North, counterclockwise.
- Outline: 301 cubic Beziers, bird height 1, origin top-left. Placed at `bird.center` with `bird.height`.
- Gradient: conic around `gradient.center`, `gradient.colors` evenly spaced from `start`, wrapping last to first.
- Glow: layers bottom to top, each a shape (disc of `radius` or the bird) filled with the gradient and gaussian blurred by `sigma`.
- Fringe: solid bird copies under the top bird. `colors` run from just under the top down to the deepest. Each sits `step` further away from `angle`.
- Themes: background and bird color by palette name. Any palette name works for either.
- Rig: `axis` is the body line, `shoulder` the half width of the body, `blend` the ramp into the wing.

## FACTS

- Photoshop's gaussian radius equals sigma. Outside the canvas counts as transparent. Blur happens in sRGB.
- SVG has no conic gradient. The renderer fakes one with `wedges` thin triangles, invisible after blur.
- Colors come from `utils/colors.py` through `mrlypy.core.palette`. The 2021 file used older Apple values.
