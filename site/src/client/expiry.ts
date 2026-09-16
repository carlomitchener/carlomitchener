import { juice, label, left } from "../lib/life.ts";

function gone() {
  for (const button of document.querySelectorAll<HTMLButtonElement>("[data-add]")) button.disabled = true;
  for (const buy of document.querySelectorAll("[data-buy]")) {
    buy.removeAttribute("href");
    buy.setAttribute("aria-disabled", "true");
  }
}

function tick() {
  const lives = document.querySelectorAll<HTMLElement>("[data-born]");
  if (!lives.length) return true;
  const now = Date.now();
  let alive = false;
  for (const life of lives) {
    const born = life.dataset.born ?? "";
    const text = life.querySelector<HTMLElement>("[data-label]");
    if (text) text.textContent = label(born, now);
    const bar = life.querySelector<HTMLElement>("[data-juice]");
    if (bar) bar.style.width = `${juice(born, now).toFixed(1)}%`;
    if (left(born, now) > 0) alive = true;
    else if (life.dataset.gate !== undefined) gone();
  }
  return !alive;
}

let timer = 0;

function run() {
  clearInterval(timer);
  if (document.hidden) return;
  if (tick()) return;
  timer = window.setInterval(() => {
    if (tick()) clearInterval(timer);
  }, 1000);
}

document.addEventListener("visibilitychange", run);
window.addEventListener("flip", run);
run();
