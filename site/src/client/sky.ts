type SkyApi = { pause: () => void; resume: () => void; jump: (seconds: number) => void; G: { visible: boolean } };

declare global {
  interface Window {
    Sky?: SkyApi;
  }
}

const box = document.querySelector<HTMLElement>("[data-sky]");
const still = matchMedia("(prefers-reduced-motion: reduce)");

let loading = false;
let shown = false;

function apply() {
  const sky = window.Sky;
  if (!sky) return;
  sky.G.visible = shown;
  if (shown && !still.matches) return sky.resume();
  sky.pause();
  if (shown) sky.jump(0);
}

function load() {
  if (loading || !box) return;
  loading = true;
  const script = document.createElement("script");
  script.type = "module";
  script.src = box.dataset.sky ?? "";
  script.onload = () => setTimeout(apply, 0);
  document.head.appendChild(script);
}

if (box) {
  new IntersectionObserver((entries) => entries.some((one) => one.isIntersecting) && load(), { rootMargin: "100% 0px" }).observe(box);
  new IntersectionObserver(
    (entries) => {
      shown = entries.some((one) => one.isIntersecting);
      apply();
    },
    { threshold: 0.05 },
  ).observe(box);
  document.addEventListener("visibilitychange", () => (document.hidden ? window.Sky?.pause() : apply()));
  still.addEventListener("change", apply);
}
