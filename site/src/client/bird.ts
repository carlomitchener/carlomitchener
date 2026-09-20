const SIZE = 56;
const SPEED = 240;
const TURN = 3;
const EDGE = 40;

let mark: HTMLElement | null = null;
let ghost: HTMLImageElement | null = null;
let raf = 0;
let last = 0;
let x = 0;
let y = 0;
let heading = 0;
let tx = 0;
let ty = 0;

const shown = () => [...mark!.querySelectorAll("img")].find((one) => getComputedStyle(one).display !== "none") ?? mark!.querySelector("img")!;

const pose = () => {
  const back = Math.cos(heading) < 0;
  const turn = back ? heading - Math.PI : heading;
  ghost!.style.transform = `translate(${x - SIZE / 2}px, ${y - SIZE / 2}px) rotate(${turn}rad)${back ? " scaleX(-1)" : ""}`;
};

const aim = () => {
  tx = EDGE + Math.random() * (innerWidth - 2 * EDGE);
  ty = EDGE + Math.random() * (innerHeight - 2 * EDGE);
};

const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));

const loop = (t: number) => {
  const dt = Math.min(0.05, (t - last) / 1000);
  last = t;
  if (Math.hypot(tx - x, ty - y) < EDGE) aim();
  const want = Math.atan2(ty - y, tx - x);
  const delta = wrap(want - heading);
  heading = wrap(heading + Math.max(-TURN * dt, Math.min(TURN * dt, delta)) + (Math.random() - 0.5) * dt);
  x = Math.max(EDGE, Math.min(innerWidth - EDGE, x + Math.cos(heading) * SPEED * dt));
  y = Math.max(EDGE, Math.min(innerHeight - EDGE, y + Math.sin(heading) * SPEED * dt));
  pose();
  raf = requestAnimationFrame(loop);
};

const fly = () => {
  const image = shown();
  const rect = image.getBoundingClientRect();
  ghost = image.cloneNode() as HTMLImageElement;
  ghost.className = "ghost";
  ghost.removeAttribute("alt");
  ghost.style.width = `${SIZE}px`;
  ghost.style.height = `${SIZE}px`;
  x = rect.left + rect.width / 2;
  y = rect.top + rect.height / 2;
  heading = Math.PI / 4;
  document.body.append(ghost);
  mark!.classList.add("away");
  aim();
  last = performance.now();
  pose();
  raf = requestAnimationFrame(loop);
};

const land = () => {
  cancelAnimationFrame(raf);
  const rect = shown().getBoundingClientRect();
  const hx = rect.left + rect.width / 2;
  const hy = rect.top + rect.height / 2;
  const dir = Math.atan2(hy - y, hx - x);
  const end = rect.width / SIZE;
  const at = (px: number, py: number, rest: string) => `translate(${px - SIZE / 2}px, ${py - SIZE / 2}px) ${rest}`;
  const gone = ghost!;
  const home = mark!;
  ghost = null;
  gone.animate(
    [
      { transform: gone.style.transform, offset: 0 },
      { transform: at(x + (hx - x) * 0.3, y + (hy - y) * 0.3, `rotate(${dir}rad) scale(1.15, 0.85)`), offset: 0.3 },
      { transform: at(x + (hx - x) * 0.75, y + (hy - y) * 0.75, `rotate(${dir}rad) scale(${end * 1.6}, ${end * 0.6})`), offset: 0.75 },
      { transform: at(hx, hy, `rotate(0rad) scale(${end})`), offset: 1 },
    ],
    { duration: 620, easing: "cubic-bezier(0.55, 0, 0.1, 1)", fill: "forwards" },
  ).onfinish = () => {
    gone.remove();
    home.classList.remove("away");
  };
};

document.addEventListener("click", (event) => {
  if (ghost) {
    event.preventDefault();
    land();
    return;
  }
  const target = event.target instanceof Element ? event.target.closest<HTMLElement>(".mark[data-fly]") : null;
  if (!target || event.metaKey || event.ctrlKey) return;
  event.preventDefault();
  mark = target;
  fly();
});

addEventListener("resize", () => {
  if (ghost) aim();
});
