import { countdown, left, moonName, moonPath, phase } from "../lib/moon.ts";

function gone() {
  for (const button of document.querySelectorAll<HTMLButtonElement>("[data-add]")) button.disabled = true;
  for (const buy of document.querySelectorAll("[data-buy]")) {
    buy.removeAttribute("href");
    buy.setAttribute("aria-disabled", "true");
  }
}

function tick() {
  const moons = document.querySelectorAll<HTMLElement>("[data-born]");
  if (!moons.length) return true;
  const now = Date.now();
  let alive = false;
  for (const moon of moons) {
    const born = moon.dataset.born ?? "";
    const ms = left(born, now);
    const f = phase(born, now);
    const lit = moon.querySelector("[data-lit]");
    if (lit) lit.setAttribute("d", moonPath(f));
    const time = moon.querySelector("[data-left]");
    if (time) time.textContent = countdown(ms);
    moon.title = `${moonName(f)}, ${countdown(ms)} left`;
    if (ms > 0) alive = true;
    else if (moon.dataset.gate !== undefined) gone();
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
