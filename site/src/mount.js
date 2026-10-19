const Mount = (() => {
  const box = document.querySelector(".sky");
  const fog = document.querySelector(".fog");
  const root = document.documentElement;
  const still = matchMedia("(prefers-reduced-motion: reduce)");
  let level = -1;
  let shown = false;
  let queued = 0;

  function apply() {
    if (root.classList.contains("splashing")) return;
    const was = shown;
    shown = G.visible = level > 0 && !document.hidden;
    if (shown && !still.matches) return Sky.resume();
    Sky.pause();
    if (shown && !was) Sky.jump(0);
  }

  function fade() {
    queued = 0;
    const next = fog ? Core.clamp(1 - scrollY / (box.offsetHeight * 0.8), 0, 1) : 1;
    if (next !== level) {
      level = next;
      const sky = Core.smooth(level);
      box.style.opacity = String(sky);
      box.style.setProperty("--melt", Core.smooth(Math.min(1, (1 - level) * 2.5)).toFixed(3));
      box.style.visibility = level > 0 ? "visible" : "hidden";
      if (fog) fog.style.opacity = String(1 - sky);
    }
    apply();
  }

  function onScroll() {
    if (!queued) queued = requestAnimationFrame(fade);
  }

  history.scrollRestoration = "manual";
  if (!location.hash) scrollTo(0, 0);
  addEventListener("scroll", onScroll, { passive: true });
  addEventListener("resize", onScroll);
  addEventListener("splashdone", fade);
  document.addEventListener("visibilitychange", apply);
  still.addEventListener("change", apply);
  fade();
  return { fade, apply };
})();
