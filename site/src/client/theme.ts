import { THEME_KEY } from "../config/tint.ts";

const ORDER = ["", "light", "dark"];
const ICON: Record<string, string> = { "": "brightness_auto", light: "light_mode", dark: "dark_mode" };
const NAME: Record<string, string> = { "": "Theme: auto", light: "Theme: light", dark: "Theme: dark" };

const root = document.documentElement;

function show() {
  const now = root.dataset.theme ?? "";
  for (const button of document.querySelectorAll<HTMLElement>("[data-theme-button]")) {
    const icon = button.querySelector(".icon");
    if (icon) icon.textContent = ICON[now];
    button.setAttribute("aria-label", NAME[now]);
    button.title = NAME[now];
  }
}

function next() {
  const now = root.dataset.theme ?? "";
  const to = ORDER[(ORDER.indexOf(now) + 1) % ORDER.length];
  if (to) root.dataset.theme = to;
  else delete root.dataset.theme;
  try {
    if (to) localStorage.setItem(THEME_KEY, to);
    else localStorage.removeItem(THEME_KEY);
  } catch {}
  show();
}

document.addEventListener("click", (event) => {
  const target = event.target instanceof Element ? event.target.closest("[data-theme-button]") : null;
  if (target) next();
});

show();
