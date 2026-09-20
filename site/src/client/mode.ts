import { MODE_KEY, THEME_COLORS } from "../config/shop.ts";

type Mode = "dark" | "light";

const listeners = new Set<() => void>();

let mode: Mode = "light";

const clean = (value: string | null): Mode | null => (value === "dark" || value === "light" ? value : null);

const stored = () => {
  try {
    return clean(localStorage.getItem(MODE_KEY));
  } catch {
    return null;
  }
};

const system = (): Mode => (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");

function paint(next: Mode) {
  mode = next;
  const root = document.documentElement;
  root.dataset.mode = next;
  const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  if (meta) meta.content = THEME_COLORS[next];
  for (const fn of listeners) fn();
  dispatchEvent(new CustomEvent("mode", { detail: next }));
}

export const get = () => mode;

export const server = (): Mode => "light";

export const none = () => null;

export function subscribe(fn: () => void) {
  listeners.add(fn);
  return () => void listeners.delete(fn);
}

function set(next: Mode) {
  try {
    localStorage.setItem(MODE_KEY, next);
  } catch {}
  paint(next);
}

export const toggle = () => set(mode === "dark" ? "light" : "dark");

export function start() {
  const dark = matchMedia("(prefers-color-scheme: dark)");
  paint(clean(document.documentElement.dataset.mode ?? null) ?? stored() ?? system());
  dark.addEventListener("change", () => {
    if (!stored()) paint(system());
  });
  addEventListener("storage", (event) => {
    if (event.key === MODE_KEY) paint(stored() ?? system());
  });
}
