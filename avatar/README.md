# AVATAR

- `bird.json` is the source of truth. Every image is a rendering of it.
- `bird.js` is generated from it plus the palette by `build.py`. Never edit by hand.
- `avatar.js` renders the recipe as SVG DOM, deforms the outline, exports SVG and PNG.
- `avatar.html` is the editor: theme, layers, glow, gradient, fringe, export, header hover demo.
- `sky.html` is the screensaver: look up, gouache clouds on a gusty wind, sun or moon, the bird soars, climbs, dives, plays with crows.
- `sky.html` itself is only meta, style, canvas and script tags; the shell lives in `sky.js`, loaded last.
- `sky.js` sizes the canvas, runs the frame loop, paints grain and vignette, reads the URL hooks, owns fullscreen and idle.
- The site builds these same files into one `sky.js` and mounts the canvas at the bottom of every page, loaded when it scrolls near and paused while off screen; `Sky.pause()`, `Sky.resume()` and `G.visible` are the hooks.
- `sky-core.js` holds `Core` (noise, seeded random, palette mixing) and `G` (shared state, the resolved look `G.T`).
- `sky-mood.js` resolves time, season, weather and moon into `G.T`, drifts through days in auto mode, owns the buttons and hooks.
- `sky-clouds.js` paints the sky gradient, stars, sun, moon phases, crossings, cloud sprites and layers, wind.
- `sky-weather.js` paints rain, snow, lightning, lens drops, leaves, petals, seeds, wind streaks.
- `sky-bird.js` is the director: soar, glide, flap, drift, roam, tumble, dive, pull, away, plus visiting crows.
- `sheet.py` shoots twelve moments and tiles them into one contact sheet.
- `render.py` renders the recipe headless to PNG and SVG in `data/carlomitchener/avatar/`.
- `bird.py` cuts favicons and wallpapers from `files/TheBird-Official.png`, and the header marks from the recipe the same way, one per theme: `site/public/bird/mark-{theme}-{128,256}.png`.

## RUN

- `uv run python carlomitchener/avatar/build.py` after editing `bird.json`.
- `uv run python carlomitchener/avatar/render.py --size 1000 --theme dark --svg`
- `uv run python carlomitchener/avatar/render.py --layers fringe,bird --crop --svg --name sticker`
- `uv run python carlomitchener/avatar/bird.py` after any recipe change; the site reads the marks from `public/`.
- Open the HTML files straight from disk. No server, no build.
- Snapshot: `bun carlomitchener/avatar/snap.ts "file:///$PWD/carlomitchener/avatar/sky.html?time=dusk&jump=8&pause=1&seed=7" data/carlomitchener/avatar/sky.png` (optional width height). Prints page errors and console logs. Safe to run in parallel.
- Contact sheet: `uv run python carlomitchener/avatar/sheet.py` writes `data/carlomitchener/avatar/sheet.png`.

## SKY HOOKS

- Look: `time=dawn|morning|noon|afternoon|dusk|night`, `season=spring|summer|autumn|winter`, `weather=clear|cloudy|rain|storm|snow|fog`, `moon=0..1`, `theme=light|dark` (noon or night).
- Presets: `mood=dawn-spring|golden|dusk-autumn|storm|rain|fog|winter-night|snow-day|full-moon|new-moon`.
- Drift: `auto=1`, `day=0..1` places the clock. A day lasts six minutes, a season three days, weather wanders on a Markov chain. Default with nothing set: auto on.
- Bird: `friends=0..3`, `mode=soar|glide|flap|drift|roam|tumble|dive|pull|away`, `dive=<sec>` (start a dive, then skip).
- Stills: `jump=<sec>` skips ahead, `pause=1` freezes, `seed=<n>` makes everything deterministic, `perf=1` logs frame times after 120 frames.
- Debug: `skip=sky,clouds,weather,bird,post` drops paint passes, `debug=1` logs the bird and `G.T` after the jump.
- Weather test hooks read by `sky-weather.js` when Mood leaves the field at 0: `rain`, `snow`, `storm`, `fog`, `leaves`, `dust` (bare flag or 0..1).
- Keys: `d` day or night, `t` time, `s` season, `w` weather, `a` auto, `m` moon phase, `v` dive, `f` friends. Double click for fullscreen where the browser has it. Cursor and buttons hide until you move or touch.

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
- Colors come from `utils/colors.py` through `mrlypy.core.colors`. The 2021 file used older Apple values.
