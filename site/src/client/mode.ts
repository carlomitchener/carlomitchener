import { MODE_KEY, THEME_COLORS } from "../config/shop.ts";

const button = document.querySelector<HTMLButtonElement>("button[data-mode]");

type Mode = "dark" | "light";

if (button) {
  const root = document.documentElement;
  const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  const dark = matchMedia("(prefers-color-scheme: dark)");

  const clean = (value: string | null): Mode | null => (value === "dark" || value === "light" ? value : null);

  const stored = () => {
    try {
      return clean(localStorage.getItem(MODE_KEY));
    } catch {
      return null;
    }
  };

  const system = (): Mode => (dark.matches ? "dark" : "light");

  const paint = (mode: Mode) => {
    root.dataset.mode = mode;
    if (meta) meta.content = THEME_COLORS[mode];
    button.setAttribute("aria-label", mode === "dark" ? "Switch to light mode" : "Switch to dark mode");
  };

  paint(clean(root.dataset.mode ?? null) ?? stored() ?? system());

  button.addEventListener("click", () => {
    const next: Mode = root.dataset.mode === "dark" ? "light" : "dark";
    try {
      localStorage.setItem(MODE_KEY, next);
    } catch {}
    paint(next);
  });

  dark.addEventListener("change", () => {
    if (!stored()) paint(system());
  });

  addEventListener("storage", (event) => {
    if (event.key === MODE_KEY) paint(stored() ?? system());
  });
}
