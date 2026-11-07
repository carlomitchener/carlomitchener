#!/usr/bin/env bash

set -euo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
cd "$HERE/.."

labs() { grep -rl --include=Cargo.toml --exclude-dir=target --exclude-dir=data '^witness = ' . | sort; }
name() { basename "$(dirname "$1")"; }
witness() { local toml="$1"; shift; cargo run --release --quiet --manifest-path "$toml" -- witness "$@"; }

case "${1:-}" in
  "")
    for toml in $(labs); do name "$toml"; done
    ;;
  all)
    failed=""
    for toml in $(labs); do
      echo "== $(name "$toml")"
      witness "$toml" all || failed="$failed $(name "$toml")"
    done
    [ -z "$failed" ] || { echo "failed:$failed" >&2; exit 1; }
    ;;
  *)
    lab="$1"; shift
    toml="$(labs | grep "/$lab/Cargo.toml$")" || { echo "no lab named $lab" >&2; exit 2; }
    [ "$#" -gt 0 ] || set -- all
    witness "$toml" "$@"
    ;;
esac
