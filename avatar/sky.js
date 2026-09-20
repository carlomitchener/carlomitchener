const Sky = (() => {
  const { noise } = Core;
  const canvas = document.querySelector("#sky"), ctx = canvas.getContext("2d");
  G.canvas = canvas; G.ctx = ctx;
  let grain, vignette, last = performance.now();

  function makeGrain() {
    const n = 256, c = document.createElement("canvas"); c.width = c.height = n;
    const g = c.getContext("2d"), img = g.createImageData(n, n);
    for (let i = 0; i < n * n; i++) { const v = 128 + (Math.random() - 0.5) * 220; img.data[i * 4] = img.data[i * 4 + 1] = img.data[i * 4 + 2] = v; img.data[i * 4 + 3] = 255; }
    g.putImageData(img, 0, 0);
    return ctx.createPattern(c, "repeat");
  }

  function makeVignette() {
    const { W, H } = G, c = document.createElement("canvas");
    c.width = Math.ceil(W / 4); c.height = Math.ceil(H / 4);
    const g = c.getContext("2d"), r = Math.hypot(c.width, c.height) / 2;
    const v = g.createRadialGradient(c.width / 2, c.height / 2, r * 0.45, c.width / 2, c.height / 2, r * 1.05);
    v.addColorStop(0, Core.rgba(Core.P.black, 0)); v.addColorStop(1, Core.rgba(Core.P.black, 0.32));
    g.fillStyle = v; g.fillRect(0, 0, c.width, c.height);
    return c;
  }

  function rebuild(resized) {
    grain = grain || makeGrain();
    if (resized) vignette = makeVignette();
    Clouds.build(resized);
    Weather.build(resized);
    Bird.build(resized);
  }

  function resize() {
    const box = canvas.getBoundingClientRect();
    const W = Math.round(box.width) || innerWidth, H = Math.round(box.height) || innerHeight;
    const DPR = Math.min(2, devicePixelRatio || 1);
    if (W === G.W && H === G.H && DPR === G.DPR) return;
    G.DPR = DPR;
    G.W = W; G.H = H; G.S = Math.min(W, H);
    canvas.width = W * DPR; canvas.height = H * DPR;
    rebuild(true);
  }

  function step(dt) {
    G.t += dt;
    Mood.step(dt);
    Clouds.step(dt);
    Weather.step(dt);
    Bird.step(dt);
  }

  function paint() {
    const { W, H, DPR, t, T } = G;
    const rot = 0.018 * noise(t * 0.05, 11), zoom = 1.04 + 0.012 * noise(t * 0.04, 13);
    const ox = 0.01 * W * noise(t * 0.045, 12), oy = 0.01 * H * noise(t * 0.05, 14);
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    ctx.translate(W / 2, H / 2); ctx.rotate(rot); ctx.scale(zoom, zoom); ctx.translate(-W / 2 + ox, -H / 2 + oy);
    if (!skip.sky) { Clouds.drawSky(); Clouds.drawStars(); Clouds.drawSun(0); }
    if (!skip.weather) Weather.draw(0);
    if (!skip.clouds) { Clouds.draw(0); Clouds.draw(1); }
    if (!skip.sky) Clouds.drawSun(1);
    if (!skip.bird) Bird.draw();
    if (!skip.weather) Weather.draw(1);
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    if (!skip.weather) Weather.draw(2);
    if (!skip.post) {
      ctx.save(); ctx.globalAlpha = 0.6 - 0.25 * (T.dark || 0); ctx.drawImage(vignette, 0, 0, W, H); ctx.restore();
      ctx.save(); ctx.globalCompositeOperation = "overlay"; ctx.globalAlpha = T.grain; ctx.fillStyle = grain; ctx.fillRect(0, 0, W, H); ctx.restore();
    }
  }

  const perf = { n: 0, step: 0, paint: 0, worst: 0 };
  let running = false;
  function frame(now) {
    if (!running) return;
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    const a = performance.now(); step(dt);
    const b = performance.now(); paint();
    const c = performance.now();
    perf.n++; perf.step += b - a; perf.paint += c - b; perf.worst = Math.max(perf.worst, c - a);
    if (perf.n === 120) { if (q.get("perf")) console.log(`perf: step ${(perf.step / perf.n).toFixed(2)}ms paint ${(perf.paint / perf.n).toFixed(2)}ms worst ${perf.worst.toFixed(1)}ms`); perf.n = perf.step = perf.paint = perf.worst = 0; }
    requestAnimationFrame(frame);
  }

  function resume() {
    if (running) return;
    running = true;
    last = performance.now();
    requestAnimationFrame(frame);
  }

  function pause() { running = false; }

  /* SCREEN */

  let queued = 0;
  function onResize() { cancelAnimationFrame(queued); queued = requestAnimationFrame(resize); }

  const box = canvas.parentElement;

  function fullscreen() {
    const el = box;
    const open = document.fullscreenElement || document.webkitFullscreenElement;
    const enter = el.requestFullscreen || el.webkitRequestFullscreen;
    const leave = document.exitFullscreen || document.webkitExitFullscreen;
    if (open) { if (leave) leave.call(document); }
    else if (enter) enter.call(el);
  }

  let idle;
  function wake() { box.classList.remove("idle"); clearTimeout(idle); idle = setTimeout(() => box.classList.add("idle"), 3000); }

  /* HOOKS */

  function jump(seconds) { for (let i = 0; i < seconds * 60; i++) step(1 / 60); paint(); }

  const q = new URLSearchParams(location.search), skip = {};
  for (const k of (q.get("skip") || "").split(",")) skip[k] = true;
  if (q.get("seed")) { G.seed = +q.get("seed"); G.rnd = Core.rng(G.seed); }
  G.rebuild = () => rebuild(false);
  Mood.init(q);
  Bird.init(q);
  addEventListener("resize", onResize);
  addEventListener("orientationchange", onResize);
  if (window.visualViewport) visualViewport.addEventListener("resize", onResize);
  box.addEventListener("mousemove", wake);
  box.addEventListener("touchstart", wake, { passive: true });
  canvas.addEventListener("dblclick", fullscreen);
  resize();
  if (q.get("jump")) jump(+q.get("jump"));
  if (q.get("dive")) { Bird.dive(); jump(+q.get("dive")); }
  if (q.get("debug")) console.log("bird", JSON.stringify(Bird.bird), "T", JSON.stringify(G.T));
  if (!q.get("pause")) resume();
  return { setTheme: (name) => Mood.set({ theme: name }), dive: Bird.dive, jump, pause, resume, resize, bird: Bird.bird, wind: G.wind, G };
})();

window.Sky = Sky;
