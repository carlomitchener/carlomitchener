# witness

- A witness is a research proof kept as a plain Rust function: it asserts, and it holds when it returns.
- Each lab lists its witnesses in a table of `(name, function)` and hands it to `witness::dispatch` at the top of `main`.
- `bash research/scripts/witness.sh` lists the labs that hold witnesses.
- `bash research/scripts/witness.sh <lab>` runs every witness of one lab; `<lab> <name>` runs one; `all` runs every lab.
- A lab binary takes the same verb: `cargo run --release -- witness` lists, `witness all` runs all, `witness <name>` runs one.
- Witnesses run in parallel, one line each, `ok` or `FAIL` with its seconds; the exit code is `1` when any fails and `2` on an unknown name.
- No gate runs them: `scripts/check.sh` compiles them and stops there.
