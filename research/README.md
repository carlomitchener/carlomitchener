# Research

Formal write-ups of [MrlyMath](../README.md#mrlymath): the mathematics that falls out of a parity rule on the corners of a cube and the Kronecker product that grows it.

- One folder per paper, each self-contained: the PDF, its LaTeX source, a sixty-second README, and the scripts that check every computational claim.
- Every claim is a theorem with a proof, a computational fact with its exact finite domain and a script behind it, or a conjecture labelled as one.
- A Lean 4 formalization of the headline theorem rides along in `lean/` where it is feasible.
- `template/` is the skeleton every new paper starts from.

## PAPERS

- [lorem-ipsum](lorem-ipsum/) - the pipeline shakedown: a toy theorem in full ceremonial dress.

## BUILD

- PDFs are committed; nothing needs installing to read.
- Rebuild any paper with [Tectonic](https://tectonic-typesetting.github.io): `tectonic paper.tex`.
- Rerun any paper's checks with plain Python: `python3 scripts/verify.py`.

## LICENCE

- Text and figures [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/); code [MIT](https://opensource.org/license/mit).
