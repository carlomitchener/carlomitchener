# crate-witnesses

- The `80` crate tests the research notes cite, back as witnesses against the split crates of `packages/rs`.
- Source: the inline tests of `crates/math`, `crates/num` and `crates/life` at commit `559ca940`, the last to carry them.
- One module a source file, named for the crate module it witnesses.
- The bodies are the originals but for the crate paths. One helper differs: `counts_faces::brute` builds its `Skeleton` field by field, `Skeleton::from_counts` being private.
- A note cites a witness as `crate-witnesses <name>`, the two words the command takes.

## RUN

- `bash research/scripts/witness.sh crate-witnesses` from the repo root: `80` witnesses, about `22` s, `21.6` s of it `the_deep_slices_hold_their_spectral_exponents`.
- `bash research/scripts/witness.sh crate-witnesses <name>` runs one.
- `the_classics_close` names two witnesses, one in `counts_faces` and one in `counts_surface`; asking for it runs both.

## MODULES

| module | witnesses the crate module | count |
|---|---|---|
| `apollonian` | `mrly_apollonian` | 2 |
| `automaton_memory` | `mrly_automaton::memory` | 7 |
| `bang_universe` | `mrly_bang::universe` | 2 |
| `coarray` | `coarray` | 4 |
| `counts_counting` | `mrly_sequences::counts::counting` | 1 |
| `counts_faces` | `mrly_sequences::counts::faces` | 5 |
| `counts_ladder` | `mrly_sequences::counts::ladder` | 1 |
| `counts_hex` | `mrly_sequences::counts::hex` | 3 |
| `counts_surface` | `mrly_sequences::counts::surface` | 3 |
| `life_step` | `mrly_life::step` | 1 |
| `num_sieve` | `mrly_zeta::sieve` | 1 |
| `radix` | `mrly_radix` | 2 |
| `roulette` | `mrly_roulette::crossings` | 4 |
| `hex_census` | `mrly_hex::census` | 5 |
| `hex_topology` | `mrly_hex::topology` | 10 |
| `spin` | `mrly_spin` | 3 |
| `spirograph` | `mrly_roulette` | 3 |
| `three_census` | `mrly_three::census` | 6 |
| `three_diagonal` | `mrly_three::diagonal` | 15 |
| `three_geometry` | `mrly_three::geometry` | 1 |
| `two_geometry` | `mrly_two::geometry` | 1 |
