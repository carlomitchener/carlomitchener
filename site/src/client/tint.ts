import { HUES, TINT_KEY } from "../config/tint.ts";

const root = document.documentElement;

function show() {
  const now = root.dataset.tint ?? "";
  for (const button of document.querySelectorAll<HTMLElement>("[data-tint-button]")) {
    button.setAttribute("aria-label", `Tint: ${now}`);
    button.title = `Tint: ${now}`;
  }
}

function next() {
  const now = root.dataset.tint ?? "";
  const to = HUES[(HUES.indexOf(now) + 1) % HUES.length];
  root.dataset.tint = to;
  try {
    localStorage.setItem(TINT_KEY, to);
  } catch {}
  show();
}

document.addEventListener("click", (event) => {
  const target = event.target instanceof Element ? event.target.closest("[data-tint-button]") : null;
  if (target) next();
});

show();
