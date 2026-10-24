#!/usr/bin/env bash

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
NAMES=(-name dist -o -name .venv -o -name node_modules -o -name __pycache__)
[ "${1:-}" = rust ] && NAMES=(-name target)

echo "Deleting what git ignores and can rebuild, under ${ROOT}:"
shopt -s nullglob
for git in "$ROOT"/*/*/.git; do
  repo="$(dirname "$git")"
  find "$repo" \( -name .git -o -name .claude -o -name private \) -prune -o \( "${NAMES[@]}" \) -type d -prune -print0 | while IFS= read -r -d '' path; do
    git -C "$(dirname "$path")" check-ignore -q "$path" && [ -z "$(git -C "$(dirname "$path")" ls-files -- "$path" | head -1)" ] || continue
    rm -rf "$path"
    echo "  ${path#"$ROOT"/}"
  done
done
[ "${1:-}" = rust ] || find "$ROOT" -type f -name .DS_Store -print -delete | sed "s|^$ROOT/|  |"
echo "Done. bun install brings node_modules back, uv run rebuilds .venv; spaghetti rust also deletes cargo targets."
