const Sky = (() => {
  const { noise } = Core;
  const canvas = document.querySelector("#sky"), ctx = canvas.getContext("2d");
  G.canvas = canvas; G.ctx = ctx;
  let grain, vignette, last = performance.now();

  function makeGrain() {
    const n = 512, N = n * n, c = document.createElement("canvas"); c.width = c.height = n;
    const g = c.getContext("2d"), img = g.createImageData(n, n), d = img.data, a = new Float32Array(N), b = new Float32Array(N), m = new Float32Array(N);
    const blur = (src, dst, r) => {
      const k = 1 / (2 * r + 1);
      for (let y = 0; y < n; y++) { let s = 0; for (let i = -r; i <= r; i++) s += src[y * n + ((i + n) % n)]; for (let x = 0; x < n; x++) { dst[y * n + x] = s * k; s += src[y * n + ((x + r + 1) % n)] - src[y * n + ((x - r + n) % n)]; } }
      for (let x = 0; x < n; x++) { let s = 0; for (let i = -r; i <= r; i++) s += dst[((i + n) % n) * n + x]; for (let y = 0; y < n; y++) { src[y * n + x] = s * k; s += dst[((y + r + 1) % n) * n + x] - dst[((y - r + n) % n) * n + x]; } }
    };
    for (let i = 0; i < N; i++) { a[i] = Math.random() - 0.5; m[i] = Math.random() - 0.5; }
    blur(a, b, 1); blur(a, b, 1); blur(m, b, 9); blur(m, b, 9);
    let sa = 0, sm = 0;
    for (let i = 0; i < N; i++) { sa += a[i] * a[i]; sm += m[i] * m[i]; }
    sa = 1 / Math.sqrt(sa / N); sm = 1 / Math.sqrt(sm / N);
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      const i = y * n + x, rel = (a[((y + n - 1) % n) * n + ((x + n - 1) % n)] - a[((y + 1) % n) * n + ((x + 1) % n)]) * sa;
      const v = 128 + (Math.random() - 0.5) * 28 + rel * 7 + a[i] * sa * 4 + m[i] * sm * 4;
      d[i * 4] = d[i * 4 + 1] = d[i * 4 + 2] = v; d[i * 4 + 3] = 255;
    }
    g.putImageData(img, 0, 0);
    const p = ctx.createPattern(c, "repeat"), k = 256, e = document.createElement("canvas"); e.width = e.height = k;
    const h = e.getContext("2d"), im = h.createImageData(k, k), q = im.data;
    for (let i = 0; i < k * k; i++) { q[i * 4] = q[i * 4 + 1] = q[i * 4 + 2] = (Math.random() + Math.random()) * 3.5; q[i * 4 + 3] = 255; }
    h.putImageData(im, 0, 0);
    p.dither = ctx.createPattern(e, "repeat");
    return p;
  }

  function makeVignette() {
    const { W, H } = G, w = Math.ceil(W / 4), h = Math.ceil(H / 4), c = document.createElement("canvas"); c.width = w; c.height = h;
    const g = c.getContext("2d"), img = g.createImageData(w, h), d = img.data;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const u = ((x + 0.5) / w) * 2 - 1, v = ((y + 0.5) / h) * 2 - 1, e = Core.clamp((Math.hypot(u, v) / Math.SQRT2 - 0.42) / 0.62, 0, 1), o = (y * w + x) * 4, s = e * e * (3 - 2 * e);
      d[o] = 6; d[o + 1] = 9; d[o + 2] = 20; d[o + 3] = 255 * s * s;
    }
    g.putImageData(img, 0, 0);
    return c;
  }

  function rebuild(resized) {
    grain = grain || makeGrain();
    if (resized) vignette = makeVignette();
    Clouds.build(resized);
    Light.build(resized);
    Weather.build(resized);
    Bird.build(resized);
    clearTimeout(warming); warming = setTimeout(warm, 40);
  }

  let warming = 0;
  function warm() { warming = 0; if (!running && !Clouds.warm(8)) warming = setTimeout(warm, 24); }

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
    Weather.air();
    Light.step(dt);
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
    if (!skip.sky) { Light.drawSky(); Light.drawStars(); Light.drawSun(0); }
    if (!skip.weather) Weather.draw(0);
    if (!skip.clouds) { Clouds.draw(0); Clouds.draw(1); }
    if (!skip.sky) Light.drawSun(1);
    if (!skip.weather) Weather.draw(3);
    if (!skip.bird) Bird.draw();
    if (!skip.weather) Weather.draw(1);
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    if (!skip.weather) Weather.draw(2);
    if (!skip.post) {
      const dk = T.dark || 0;
      if (grain.dpr !== DPR && grain.setTransform) { const m = new DOMMatrix([1 / DPR, 0, 0, 1 / DPR, 0, 0]); grain.setTransform(m); grain.dither.setTransform(m); grain.dpr = DPR; }
      ctx.save(); ctx.imageSmoothingEnabled = true; ctx.globalAlpha = 0.05 + 0.15 * dk; ctx.drawImage(vignette, 0, 0, W, H);
      ctx.fillStyle = grain; ctx.globalCompositeOperation = "overlay"; ctx.globalAlpha = Math.min(1, T.grain * 1.6); ctx.fillRect(0, 0, W, H);
      if (dk > 0.3) { ctx.fillStyle = grain.dither; ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha = 0.5 * Math.min(1, (dk - 0.3) / 0.4); ctx.fillRect(0, 0, W, H); }
      ctx.restore();
    }
  }

  const perf = { n: 0, step: 0, paint: 0, worst: 0 };
  let running = false;
  function frame(now) {
    if (!running) return;
    const dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
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
  G.rebuild = (fresh) => rebuild(!!fresh);
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
  return { setTheme: (name) => Mood.set({ theme: name }), dive: Bird.dive, jump, pause, resume, resize, skip, bird: Bird.bird, wind: G.wind, G };
})();

window.Sky = Sky;
