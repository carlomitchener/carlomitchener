#!/usr/bin/env bash

set -uo pipefail

PIDS=()
for pid in $(lsof -nP -a -u "$USER" -iTCP -sTCP:LISTEN -t 2>/dev/null | sort -un); do
  exe="$(ps -o comm= -p "$pid")" args="$(ps -o args= -p "$pid")"
  case "$exe" in
    "$HOME"/Library/*) continue ;;
    "$HOME"/*|/opt/homebrew/*|/usr/local/*|/private/tmp/*|/tmp/*) ;;
    *) [[ "$args" == *--headless* ]] || continue ;;
  esac
  echo "$pid on $(lsof -nP -a -p "$pid" -iTCP -sTCP:LISTEN -Fn | sed -n 's/^n.*://p' | sort -un | xargs): ${args:0:90}"
  PIDS+=("$pid")
done
[ ${#PIDS[@]} -gt 0 ] || { echo "no dev servers listening"; exit 0; }
if [ "${1:-}" = kill ]; then
  kill "${PIDS[@]}" 2>/dev/null
  sleep 1
  kill -9 "${PIDS[@]}" 2>/dev/null
  echo "stopped"
fi
