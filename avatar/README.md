# AVATAR

- `bird.json` is the source of truth. Every image is a rendering of it.
- `bird.js` is generated from it plus the palette by `build.py`. Never edit by hand.
- `avatar.js` renders the recipe as SVG DOM, deforms the outline, exports SVG and PNG.
- `avatar.html` is the editor: theme, layers, glow, gradient, fringe, export, header hover demo.
- `sky.html` is the screensaver: look up, painted clouds on a gusty wind, sun or moon, dust and leaves in the air, the bird soars, climbs, dives, plays with crows. No buttons: every load draws a fresh mood.
- `sky.html` itself is only meta, style, canvas and script tags; the shell lives in `sky.js`, loaded last.
- `sky.js` sizes the canvas, runs the frame loop, paints grain and vignette, reads the URL hooks, owns fullscreen and idle, and while paused renders the clouds ahead in idle slices (`Clouds.warm`), so the first frame after a rebuild never stalls.
- The site (`site/`) bundles these same files, in that order, then `splash.js`, into one `sky.js`, and ships `splash.css`: the canvas is the first screen, above the README, and fades and pauses as it scrolls away; `Sky.pause()`, `Sky.resume()` and `G.visible` are the hooks.
- `sky-core.js` holds `Core` (noise, seeded random, palette mixing) and `G` (shared state, the resolved look `G.T`).
- `sky-mood.js` resolves time, season, weather and moon into `G.T`, draws a random mood weighted toward golden hours and gentle skies on load (`Mood.shuffle()` draws another), drifts through days in auto mode, places the sun and the moon on their own arcs, owns the keys and hooks; the sky bird is white in light mode, and in dark mode black by day and white at night.
- `splash.js` follows the system theme with the recipe's `themes`: light is a white ground, white glow edge and white bird, dark is black; its glow mask is drawn in the 1024 px image's own units, because WebKit clamps SVG filter regions (about 4096 user units) and cropped the glow to a square on iPhone. On release the glow dissolves into WebGL2 dust that rides the sky's wind while the sky opens from the center; each relock draws a new mood under the veil.
- `sky-clouds.js` grows procedural cloud fields (cumulus, towers, fractus, stratocumulus, altocumulus, cirrus, nimbostratus, mist) on five depth layers over a curved dome, shades them per pixel toward the sun, spreads the work over frames, and answers `Clouds.veil(x, y)`, the cloud cover at a point.
- `sky-light.js` paints the dome, stars, Milky Way, meteors, sun, moon phases, and rare optics: the circumzenithal arc, a rainbow after rain, the 22° halo.
- `sky-weather.js` owns the wind (`Weather.air()` sets `G.wind`, `Weather.flow(x, y)` is the local gust field) and paints rain, snow, lightning (`G.flash`), lens drops that refract the sky, wind ribbons, motes, leaves, petals, seeds.
- `sky-bird.js` is the director: soar, glide, flap, drift, roam, tumble, dive, pull, away, plus visiting crows; wing poses blend continuously and `Bird.pose()` is the one on screen.
- `sheet.py` shoots twelve moments and tiles them into one contact sheet.
- `render.py` renders the recipe headless to PNG and SVG in `data/avatar/`.
- `bird.py` cuts the marks from `files/TheBird-Official.png` into `site/public/bird/` (`bird-{size}.png`, `square-180.png`, `mark-{theme}-{128,256}.png` from the recipe, and the site's no-JS still: `glow-{theme}.webp` and `still-{theme}.svg`), and the wallpapers into `files/`; the site's favicons are copied from there.

## RUN

- Run from the repo root.
- `uv run python avatar/build.py` after editing `bird.json`.
- `uv run --group avatar python avatar/render.py --size 1000 --theme dark --svg`
- `uv run --group avatar python avatar/render.py --layers fringe,bird --crop --svg --name sticker`
- `--pad 0.5` widens the canvas by half on every side, so the glow fades out inside the image.
- `uv run --group avatar python avatar/bird.py` after any recipe change; the next `site` build picks the favicons up.
- Open the HTML files straight from disk. No server, no build.
- Snapshot: `bun avatar/snap.ts "file:///$PWD/avatar/sky.html?time=dusk&jump=8&pause=1&seed=7" data/avatar/sky.png` (optional width height). Prints page errors and console logs. Safe to run in parallel.
- Contact sheet: `uv run python avatar/sheet.py` writes `data/avatar/sheet.png`.

## SKY HOOKS

- Look: `time=dawn|morning|noon|afternoon|dusk|night`, `season=spring|summer|autumn|winter`, `weather=clear|cloudy|rain|storm|snow|fog`, `moon=0..1`, `theme=light|dark` (noon or night).
- Presets: `mood=dawn-spring|golden|dusk-autumn|storm|rain|fog|winter-night|snow-day|full-moon|new-moon`.
- Drift: `auto=1`, `day=0..1` places the clock. A day lasts six minutes, a season three days, weather wanders on a Markov chain. Default with nothing set: a random mood, auto on.
- Bird: `friends=0..3`, `mode=soar|glide|flap|drift|roam|tumble|dive|pull|away`, `dive=<sec>` (start a dive, then skip).
- Stills: `jump=<sec>` skips ahead, `pause=1` freezes, `seed=<n>` makes everything deterministic, `perf=1` logs frame times after 120 frames.
- Debug: `skip=sky,clouds,weather,bird,post` drops paint passes, `debug=1` logs the bird and `G.T` after the jump, `optics=arc,bow,halo,meteor` forces the rare sights on and `optics=off` turns them off.
- Weather test hooks read by `sky-weather.js` when Mood leaves the field at 0: `rain`, `snow`, `storm`, `fog`, `leaves`, `dust` (bare flag or 0..1).
- Keys: `d` day or night, `t` time, `s` season, `w` weather, `a` auto, `m` moon phase, `v` dive, `f` friends. Double click for fullscreen where the browser has it. The cursor hides until you move or touch.

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
- Colors come from `mrly.core.colors`. The 2021 file used older Apple values.
