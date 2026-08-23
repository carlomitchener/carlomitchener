# The Lorem Ipsum Theorem

A placeholder paper that knows it: it exists to prove the pipeline that builds, checks, and ships every paper on this shelf, and a toy theorem rides along so that every part of the machine turns once.

![The level-two lorem carpet: 64 cells where 81 could stand.](figures/carpet.svg)

Take a square, cut it into nine equal squares, throw away the middle one, and repeat inside each survivor: the *lorem carpet*. Cell $(x, y)$ of the level-$L$ grid survives exactly when no base-3 digit position has $x_i = y_i = 1$.

**Theorem.** The level-$L$ lorem carpet holds exactly $8^L$ cells.

Eight choices per digit position, multiplied. The paper proves it twice, and a script re-counts every cell through level six: $1, 8, 64, 512, 4096, 32768, 262144$.

- [paper.pdf](paper.pdf) - the paper.
- `tectonic paper.tex` rebuilds it; `python3 scripts/verify.py` re-checks every number; `python3 scripts/figure.py` redraws the carpet.
