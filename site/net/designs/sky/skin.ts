import type { Tokens } from "@mrlyprod/shell/design.ts";

export const LIGHT: Tokens = {
  "--bg": "#f7f9fc",
  "--panel": "#eef2f8",
  "--deep": "#e3e9f2",
  "--line": "#d6deea",
  "--dim": "#525a66",
  "--accent": "#0a84d6",
  "--link": "#0a6fb8",
  "--frost": "color-mix(in srgb, #f7f9fc 50%, transparent)",
};

export const DARK: Tokens = {
  "--bg": "#05070c",
  "--panel": "#0d1118",
  "--deep": "#000000",
  "--line": "#1c2330",
  "--dim": "#9aa3b2",
  "--accent": "#4fb4ff",
  "--link": "#7cc6ff",
  "--frost": "color-mix(in srgb, #05070c 50%, transparent)",
};
