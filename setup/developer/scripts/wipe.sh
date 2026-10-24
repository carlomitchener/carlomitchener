#!/usr/bin/env bash

set -euo pipefail

if pgrep -aixq claude; then
  echo "Quit Claude first, the app and every terminal session: wipe deletes what they're using." >&2
  exit 1
fi

KEEP=" plugins settings.json CLAUDE.md agents commands skills keybindings.json "
PLAN=()
shopt -s dotglob nullglob
for entry in "$HOME"/.claude/* /private/tmp/claude-"$(id -u)"/*; do
  [[ "$KEEP" == *" $(basename "$entry") "* && "$entry" == "$HOME"/.claude/* ]] || PLAN+=("$entry")
done
[ ${#PLAN[@]} -gt 0 ] || { echo "Nothing to wipe."; exit 0; }

printf '  %s\n' "${PLAN[@]}"
read -rp "Delete these ${#PLAN[@]}? Settings, plugins and CLAUDE.md files stay. [y/N] " answer
[[ "$answer" == [yY] ]] || { echo "Aborted."; exit 1; }
rm -rf "${PLAN[@]}"
echo "Wiped. Claude starts fresh."
