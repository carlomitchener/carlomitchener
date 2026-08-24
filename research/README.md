# Research

Formal write-ups of [MrlyMath](../README.md#mrlymath): the mathematics that falls out of a parity rule on the corners of a cube and the Kronecker product that grows it.

- One folder per paper, each self-contained: the PDF, its LaTeX source, a sixty-second README, and the scripts that check every computational claim.
- Every claim is a theorem with a proof, a computational fact with its exact finite domain and a script behind it, or a conjecture labelled as one.
- A Lean 4 formalization of the headline theorem rides along in `lean/` where it is feasible.
- `template/` is the skeleton every new paper starts from.

## PAPERS

- [coprime-density-above-dimension-one](coprime-density-above-dimension-one/) - the visible-point density of every digit-restricted fractal above dimension one, exactly.
- [lemma-b-pincer](lemma-b-pincer/) - the missing dimension-one estimate squeezed from both edges, and two routes past it proved shut.
- [menger-pairwise-coprimality](menger-pairwise-coprimality/) - drilling the sponge's holes costs its coordinates exactly 12.25 percent of their pairwise-coprimality odds.
- [walsh-spectrometer](walsh-spectrometer/) - the exact slice ink of all 256 parity designs, with the design's Walsh spectrum as the coefficients.
- [slice-recurrence-order](slice-recurrence-order/) - Menger diagonal slice counts obey a recurrence of order exactly ceil(D/2), and at odd D != 1 mod 3 their exponent provably beats the generic slice dimension.
- [slice-sign-even-half](slice-sign-even-half/) - the even half of the slice sign law: below the generic exponent in every even dimension at bases 3 and 5, the quadratic base-3 transient identified exactly, and the Jacobsthal tent rank law behind the remaining strictness gap.
- [gasket-ray-machine](gasket-ray-machine/) - which origin lines hit a base-3 design, how much each catches, and a spectral gap at two.
- [order-sensitivity-of-kronecker-words](order-sensitivity-of-kronecker-words/) - what survives swapping nested patterns, and the connectivity that does not.
- [moire-correlation-laws](moire-correlation-laws/) - two parity carpets agree by an exact gcd law, zero exactly when the scales are coprime; the stack's full spectrum is the squared-divisor field of the frequency gcd, zeta quotients and nothing more.
- [divisor-avatars](divisor-avatars/) - when a parity design's cell census is the divisor count of a power, and exactly which integers have one.
- [lorem-ipsum](lorem-ipsum/) - the pipeline shakedown: a toy theorem in full ceremonial dress.

## BUILD

- PDFs are committed; nothing needs installing to read.
- Rebuild any paper with [Tectonic](https://tectonic-typesetting.github.io): `tectonic paper.tex`.
- Rerun any paper's checks with plain Python: `python3 scripts/verify.py`.

## LICENCE

- Text and figures [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/); code [MIT](https://opensource.org/license/mit).
