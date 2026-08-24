# Moiré

What happens when you stack the snowflakes on top of each other? ...Something nobody drew.

Take every odd number from 1 to 55, slice each sponge, blow all twenty-eight grams up to exactly the same size, and lay them down like sheets of tracing paper — each one faint enough that no single number gets to win.

![every odd 3D carpet from 1 to 55, stacked](files/extras/mrlygram-heatmap.gif)

Watch it build. The first few frames are still recognizable snowflakes. Then somewhere past twenty the individual grams dissolve, and a picture surfaces that was in none of them: long straight rays crossing the whole hexagon, a ghost star at the middle, the six-fold symmetry still holding. That's *moiré* — the shimmer you get for free when you overlay grids of different pitch, the same one that ripples through two layers of net curtain, or across a photographed computer screen.

And it has to be there. Every gram is the same *at most one odd* test, just chopped finer: 1 unit across, then 3, then 5, all the way to 55. Their features land on top of each other wherever the numbers agree, and cancel wherever they don't — the bright and dark rays are a map of that agreement. Arithmetic, made visible by nothing more cunning than stacking.

The same trick works one dimension down. Here are the flat 2D carpets — the square grids from [How the pictures are made](README.md#how-the-pictures-are-made) — stacked the same way:

![every odd 2D carpet from 1 to 55, stacked](files/extras/mrlycarpet-heatmap.gif)

Squares instead of triangles, so the rays run diagonally rather than at 60°, but it's the same phenomenon: the main diagonal comes out twice as bright as the field around it. And that *twice* is exact — keep stacking and the ratio settles at precisely 2. (Twice the white *paper* showing, to be exact.) Look again: the other diagonal is its pixel-perfect twin, because every gram reads the same forwards and backwards. The picture carries a bright X. And look at the very center. That one dot alternates fill, void, fill, void as the number climbs — the same *n* mod 4 flip that powers [the solution](SOLUTION.md) — so across twenty-eight numbers it settles at exactly 50/50: a perfect mid-gray pinprick at the heart of the picture.

How far can you push it? Further than you'd guess. The field between the rays does slowly gray out — barely slower than a pile of random patterns would, it turns out — but the rays themselves never dim: each one keeps its exact brightness forever and only grows thinner, so every layer you add makes the picture sharper, not blurrier. Pixels give out first: at 1080 across, somewhere past number 150 each cell is thinner than two pixels, and the finest grams quietly turn to fog. (Memory goes next — number 301 wants 1.7 GB just to hold its blown-up cube.)

Run it yourself with `MIN` and `MAX` at the top of `mrlypy/mrlydemos/mrlygram.py`:

```bash
uv run mrlypy/mrlydemos/mrlygram.py cut carpet     # the snowflakes, stacked
uv run mrlypy/mrlydemos/mrlygram.py flat carpet    # the 2D carpets, stacked
uv run mrlypy/mrlydemos/mrlygram.py sweep          # both views, all four families
```

## The stack answers back

Is π lurking in here? What about the primes? We stacked, we measured, we proved — and the answers are stranger than the questions. Each headline links its paper on [the research shelf](../research/), where every claim ships with a script that re-checks it.

**The primes hide one dimension down.** Take the flat carpets of two odd numbers, say 9 and 15, stretch them to the same size, lay one over the other, and count the cells where they agree. Strangers would agree exactly as often as chance predicts; the overshoot is their *correlation*. It obeys an exact law: all that matters is the *greatest common divisor* — the largest number dividing both. Share a factor, as 9 and 15 share 3, and the carpets echo each other by a precise, positive fraction. Share none, as 9 and 25, and the correlation is *exactly* zero. Not tiny, not zero-to-five-decimals: zero, as a proved fraction. So an odd number is prime exactly when its carpet is a total stranger to every carpet before it. Draw the times-table of these agreements and the primes are its all-white rows:

![the correlation between parity carpets at odd scales 3 to 63, white where the scales are coprime; the all-white rows are the primes](../research/moire-correlation-laws/figures/carpet.svg)

One honest footnote: this is a portrait of primality, not a shortcut to it — testing "is the correlation zero?" costs about as much as plain old trial division. The picture doesn't beat the arithmetic; it *is* the arithmetic, drawn. The paper: [Parity Carpets Correlate by gcd](../research/moire-correlation-laws/).

**The snowflakes refuse to obey.** The diagonal cut smuggles a faint overtone into every snowflake — an extra wave vibrating twice as fast — and that overtone lets snowflake *m* whisper to snowflakes 2*m*−1 and 2*m*+1, its almost-doubles, even when the numbers share no factor. Coprime no longer means stranger; the slice carries gossip of its own. The write-up is in the pipeline.

**Pi plays a magic trick.** Why are all those agreement numbers plain fractions — where's π? It enters twice and cancels itself. Every stripe pattern here is secretly a sum of smooth waves — Fourier's old trick — and building a sharp-edged stripe out of smooth waves costs a factor of 4/π, so every ingredient is soaked in π. But a strength you can actually *see* compares waves against waves, which squares the π on top — and the bottom of the same fraction sums the series 1 + 1/9 + 1/25 + ⋯, which happens to be exactly π²/8. Top π², bottom π², gone — every time. That's the theorem behind "the diagonal is exactly twice the field": every visible strength in these stacks is a plain fraction, and π lives only in the machinery. (Same paper as the primes.)

**Count instead of measure, and π steps back out.** Mark a grid point when its two coordinates share no factor — the same coprime test, drawn as one picture instead of a stack. Those are exactly the points you can *see* from the corner of the grid; every other point hides behind a nearer one on its line of sight. The visible share of the grid creeps toward 6/π² ≈ 60.79%, so counting cells in a big enough picture and taking a square root spits out π: a 100,000-wide grid delivers 3.14158 by counting alone. And the census survives on the fractals: restricted to a fractal's own cells the density is still a clean fraction times the classical one — for the Sierpinski gasket, exactly 16/(3π²) — proved in [Coprimality Density Above Dimension One](../research/coprime-density-above-dimension-one/). One dimension up the census trades π for Apéry's constant, and [Menger Pairwise Coprimality](../research/menger-pairwise-coprimality/) prices the sponge itself: drilling its holes costs the coordinates exactly 12.25% of their coprimality odds. Stranger constants — ink budgets creeping toward *Catalan's constant*, a number nobody has even proved isn't secretly a fraction — are still on the workbench.

**The brightest lines have names.** The strongest rays crossing the stacked snowflake sit at the quarter marks of its width, and their strength is an exact step of one eighth — 0.125 — that every single layer votes for identically: the measured step reads 0.1245 by twelve hundred layers and is still creeping in. That write-up is in the pipeline too.

**And recipes have fingerprints.** Our sponge comes from one little parity test, but in 3D there are exactly 256 such tests — a whole zoo of sponges. The slice of any of them prints its own recipe: the hexagon's ink fraction follows one exact formula, valid for all 256 recipes at every odd number, and the formula's coefficients *are* the recipe's fingerprint — its Walsh spectrum, the signal-processing kind. Point the slice at a mystery sponge and it reads the recipe back; that's [The Walsh Spectrometer](../research/walsh-spectrometer/). The leapfrog from [the bonus solution](README.md#the-bonus-solution) is in there too: some recipes *blink* — one layer mostly ink, the next mostly paper — and the blink's size is exactly minus half of one particular fingerprint number, so the recipe tells you, before a single triangle is drawn, whether its stack blinks or holds steady. The *void* family is the showstopper: its stack keeps a twelve-armed star and a jet-black center dot *forever*, while the carpet's ghost star slowly dissolves into the gray.

![every odd 3D void from 1 to 55, stacked](files/extras/cut-void-1.gif)

The full hunt — teams of AI agents checking each other's work, refuting each other freely — lives on [the research shelf](../research/), and more papers are landing.
