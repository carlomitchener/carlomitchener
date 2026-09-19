const Clouds = (() => {
  const { TAU, clamp, smooth, noise, rng, mix, rgba, P } = Core;
  const SEED = [11, 23, 37, 41, 59, 67, 83], CSEED = [101, 149];
  let skyCache, fogCache, paper, sprites = [], cirrus = [], clouds = [], stars = [], key = "", queue = [], qt = 0, sunPt = [0, 0];

  const F = (v, d) => (v === undefined || v === null ? d : v);
  const cover = () => clamp(F(G.T.cover, 0.4), 0, 1);
  const dark = () => clamp(F(G.T.dark, G.T.sun ? 0 : 1), 0, 1);
  const elev = () => clamp(F(G.T.sunElev, 0.7), 0, 1);
  const fog = () => clamp(F(G.T.fog, 0), 0, 1);
  const storm = () => clamp(F(G.T.storm, 0), 0, 1);
  const warmC = () => F(G.T.warm, G.T.light);
  const lowSun = () => 1 - smooth(clamp(elev() / 0.34, 0, 1));

  function lightDir() {
    const [sx, sy] = Mood.sunAt();
    const dx = sx - G.W / 2, dy = sy - G.H / 2, m = Math.hypot(dx, dy) || 1;
    return [dx / m, dy / m];
  }

  // SPRITES

  function dab(g, x, y, r, col, a, rot, sq) {
    const gr = g.createRadialGradient(x, y, r * 0.22, x, y, r);
    gr.addColorStop(0, rgba(col, a)); gr.addColorStop(0.64, rgba(col, a * 0.86)); gr.addColorStop(1, rgba(col, 0));
    g.save(); g.translate(x, y); g.rotate(rot); g.scale(1, sq); g.translate(-x, -y);
    g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); g.restore();
  }

  function makePaper() {
    const n = 110, c = document.createElement("canvas");
    c.width = c.height = n;
    const g = c.getContext("2d"), rnd = rng(9173);
    for (let i = 0; i < 170; i++) {
      const x = rnd() * n, y = rnd() * n, r = 0.7 + rnd() * 2.4, col = rnd() < 0.5 ? P.white : P.gray;
      for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) {
        const px = x + dx * n, py = y + dy * n;
        if (px < -r || py < -r || px > n + r || py > n + r) continue;
        const gr = g.createRadialGradient(px, py, 0, px, py, r);
        gr.addColorStop(0, rgba(col, 0.45)); gr.addColorStop(1, rgba(col, 0));
        g.fillStyle = gr; g.beginPath(); g.arc(px, py, r, 0, TAU); g.fill();
      }
    }
    return c;
  }

  function makeSky() {
    const T = G.T, W = G.W, H = G.H, DPR = G.DPR;
    const c = document.createElement("canvas");
    const w = Math.ceil(W * 1.16), h = Math.ceil(H * 1.16);
    c.width = w * DPR; c.height = h * DPR;
    const g = c.getContext("2d");
    g.scale(DPR, DPR);
    const d = dark(), navy = mix(P.indigo, P.black, 0.72), zen = mix(mix(T.zenith, T.mid, 0.45), navy, 0.35 * d), md = mix(T.mid, navy, 0.4 * d), rm = mix(T.rim, mix(P.indigo, P.black, 0.55), 0.4 * d);
    const grad = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, Math.hypot(w, h) * 0.66);
    grad.addColorStop(0, zen); grad.addColorStop(0.3, mix(zen, md, 0.45)); grad.addColorStop(0.62, md); grad.addColorStop(1, rm);
    g.fillStyle = grad; g.fillRect(0, 0, w, h);
    const [sx, sy] = Mood.sunAt(), tint = g.createRadialGradient(sx + w * 0.08, sy + h * 0.08, 0, sx + w * 0.08, sy + h * 0.08, Math.max(w, h) * 0.75);
    tint.addColorStop(0, T.sun ? T.tint : rgba(mix(P.white, P.indigo, 0.35), 0.16 * (1 - Math.abs(2 * F(T.moon, 0.5) - 1)) + 0.05)); tint.addColorStop(1, rgba(P.black, 0));
    g.fillStyle = tint; g.fillRect(0, 0, w, h);
    return c;
  }

  function makeFog() {
    const T = G.T, n = 256, c = document.createElement("canvas");
    c.width = c.height = n;
    const g = c.getContext("2d"), col = mix(T.rim, T.body, 0.5);
    const gr = g.createRadialGradient(n * 0.5, n * 0.42, 0, n * 0.5, n * 0.5, n * 0.72);
    gr.addColorStop(0, rgba(col, 0.92)); gr.addColorStop(0.55, rgba(col, 0.66)); gr.addColorStop(1, rgba(col, 0.18));
    g.fillStyle = gr; g.fillRect(0, 0, n, n);
    return c;
  }

  function makeCloud(seed) {
    const T = G.T, rnd = rng(seed), w = 640, h = 480, c = document.createElement("canvas");
    c.width = w * 2; c.height = h * 2;
    const g = c.getContext("2d"); g.scale(2, 2);
    const lo = lowSun(), [lx, ly] = lightDir();
    const body = T.body, lit = mix(T.light, warmC(), 0.22 * lo), shade = mix(mix(mix(T.shade, T.mid, 0.28), warmC(), 0.5 * lo), T.body, 0.5 * dark()), rim = mix(warmC(), T.light, 0.25 * (1 - lo));
    const baseY = h * 0.79, n = 3 + Math.floor(rnd() * 3), lobes = [];
    for (let i = 0; i < n; i++) {
      const u = (i + 0.5) / n, arch = Math.sin(Math.PI * u);
      const r = h * (0.12 + 0.17 * arch) * (0.82 + 0.4 * rnd());
      const x = w * (0.17 + 0.66 * u) + (rnd() - 0.5) * w * 0.05, y = baseY - r * 0.88 - arch * h * 0.05 * rnd();
      lobes.push({ x, y, r });
      for (let j = 0, m = 2 + Math.floor(rnd() * 3); j < m; j++) {
        const a = -Math.PI * (0.1 + 0.8 * rnd()), rr = r * (0.36 + 0.34 * rnd());
        const cx = x + Math.cos(a) * r * (0.52 + 0.42 * rnd()), cy = y + Math.sin(a) * r * (0.58 + 0.36 * rnd());
        lobes.push({ x: cx, y: cy, r: rr });
        if (rnd() < 0.55) {
          const b = -Math.PI * (0.05 + 0.9 * rnd());
          lobes.push({ x: cx + Math.cos(b) * rr * 0.72, y: cy + Math.sin(b) * rr * 0.68, r: rr * (0.45 + 0.3 * rnd()) });
        }
      }
    }
    let f0 = w, f1 = 0, ft = h;
    for (const p of lobes) { f0 = Math.min(f0, p.x - p.r * 1.2); f1 = Math.max(f1, p.x + p.r * 1.2); ft = Math.min(ft, p.y - p.r * 1.2); }
    const fk = Math.min(1, w * 0.94 / (f1 - f0), (baseY - h * 0.03) / (baseY - ft)), fc = (f0 + f1) / 2;
    for (const p of lobes) { p.x = w / 2 + (p.x - fc) * fk; p.y = baseY - (baseY - p.y) * fk; p.r *= fk; }
    let x0 = w, x1 = 0;
    for (const p of lobes) { x0 = Math.min(x0, p.x - p.r); x1 = Math.max(x1, p.x + p.r); }
    for (let x = x0 + h * 0.08; x < x1 - h * 0.08; x += h * 0.11) lobes.push({ x: x + (rnd() - 0.5) * h * 0.03, y: baseY - h * 0.105 + (rnd() - 0.5) * h * 0.02, r: h * (0.125 + 0.05 * rnd()), base: true });
    let lo0 = 1e9, lo1 = -1e9;
    for (const p of lobes) { const d = p.x * lx + p.y * ly; lo0 = Math.min(lo0, d); lo1 = Math.max(lo1, d); }
    lobes.sort((a, b) => b.y - a.y);
    const wob = [];
    for (let i = 0; i <= 8; i++) wob.push(baseY + (rnd() - 0.5) * h * 0.04);
    g.save(); g.beginPath(); g.moveTo(0, 0); g.lineTo(w, 0); g.lineTo(w, wob[8]);
    for (let i = 8; i > 0; i--) g.quadraticCurveTo(w * (i - 0.5) / 8, (wob[i] + wob[i - 1]) / 2 + (rnd() - 0.5) * h * 0.03, w * (i - 1) / 8, wob[i - 1]);
    g.lineTo(0, 0); g.closePath(); g.clip();
    for (const p of lobes) {
      dab(g, p.x, p.y, p.r, body, p.base ? 0.86 : 0.74, (rnd() - 0.5) * 0.7, p.base ? 0.94 : 0.86 + 0.24 * rnd());
      for (let i = 0, m = p.base ? 2 : 3; i < m; i++) {
        const a = rnd() * TAU, d = Math.sqrt(rnd()) * p.r * (p.base ? 0.2 : 0.34);
        dab(g, p.x + Math.cos(a) * d, p.y + Math.sin(a) * d, p.r * (0.58 + 0.34 * rnd()), body, p.base ? 0.7 : 0.56, rnd() * TAU, p.base ? 0.86 : 0.72 + 0.4 * rnd());
      }
    }
    g.restore();
    g.globalCompositeOperation = "source-atop";
    const cl = 1 - 0.55 * dark();
    for (const p of lobes) {
      const e = smooth(((p.x * lx + p.y * ly) - lo0) / (lo1 - lo0 || 1)), ex = (0.3 + 0.7 * e) * (p.base ? 0.12 : 1) * cl;
      dab(g, p.x - lx * p.r * 0.3, p.y + p.r * 0.52 - ly * p.r * 0.24, p.r * 0.92, shade, 0.34 * (1.25 - 0.7 * e), rnd() * TAU, 0.66 + 0.26 * rnd());
      if (ex < 0.22) continue;
      dab(g, p.x + lx * p.r * 0.42, p.y + ly * p.r * 0.42, p.r * 0.72, lit, 0.34 * ex, (rnd() - 0.5) * 0.8, 0.74 + 0.3 * rnd());
      dab(g, p.x + lx * p.r * 0.6, p.y + ly * p.r * 0.6, p.r * 0.42, lit, 0.3 * ex, rnd() * TAU, 0.8 + 0.3 * rnd());
      if (ex < 0.5) continue;
      dab(g, p.x + lx * p.r * 0.86, p.y + ly * p.r * 0.86, p.r * 0.34, rim, 0.3 * ex * ex, rnd() * TAU, 0.7 + 0.3 * rnd());
    }
    const dg = g.createLinearGradient(w / 2 + lx * h * 0.5, baseY * 0.5 + ly * h * 0.5, w / 2 - lx * h * 0.5, baseY * 0.5 - ly * h * 0.5);
    dg.addColorStop(0, rgba(lit, 0.28)); dg.addColorStop(0.5, rgba(body, 0)); dg.addColorStop(1, rgba(shade, 0.44));
    g.fillStyle = dg; g.fillRect(0, 0, w, h);
    const ug = g.createLinearGradient(0, baseY - h * 0.2, 0, baseY);
    ug.addColorStop(0, rgba(shade, 0)); ug.addColorStop(1, rgba(mix(shade, warmC(), 0.4 * lo), 0.42));
    g.fillStyle = ug; g.fillRect(0, 0, w, h);
    g.globalAlpha = 0.055 * (1 - dark()); g.fillStyle = g.createPattern(paper, "repeat"); g.fillRect(0, 0, w, h);
    g.globalAlpha = 1; g.globalCompositeOperation = "destination-out";
    const fg = g.createLinearGradient(0, baseY - h * 0.09, 0, baseY + h * 0.025);
    fg.addColorStop(0, rgba(P.black, 0)); fg.addColorStop(0.55, rgba(P.black, 0.3)); fg.addColorStop(1, rgba(P.black, 0.85));
    g.fillStyle = fg; g.fillRect(0, baseY - h * 0.09, w, h * 0.2);
    g.globalCompositeOperation = "source-over";
    return { c, ar: h / w };
  }

  function makeCirrus(seed) {
    const T = G.T, rnd = rng(seed), w = 768, h = 200, c = document.createElement("canvas");
    c.width = w * 2; c.height = h * 2;
    const g = c.getContext("2d"); g.scale(2, 2);
    const lo = lowSun(), col = mix(mix(T.body, T.light, 0.6), warmC(), 0.35 * lo);
    for (let s = 0, ns = 3 + Math.floor(rnd() * 3); s < ns; s++) {
      const y0 = h * (0.2 + 0.6 * rnd()), tilt = (rnd() - 0.5) * 0.22, x0 = w * rnd() * 0.3, len = w * (0.5 + 0.45 * rnd());
      const k = 16 + Math.floor(rnd() * 12);
      for (let i = 0; i < k; i++) {
        const u = i / (k - 1), env = Math.sin(Math.PI * u);
        const x = x0 + len * u, y = y0 + Math.sin(tilt) * len * u + (rnd() - 0.5) * h * 0.05;
        dab(g, x, y, h * (0.1 + 0.16 * env) * (0.7 + 0.5 * rnd()), col, 0.13 * env + 0.035, tilt + (rnd() - 0.5) * 0.14, 0.12 + 0.12 * rnd());
      }
    }
    g.globalCompositeOperation = "source-atop";
    g.globalAlpha = 0.05 * (1 - dark()); g.fillStyle = g.createPattern(paper, "repeat"); g.fillRect(0, 0, w, h);
    g.globalAlpha = 1; g.globalCompositeOperation = "source-over";
    return { c, ar: h / w };
  }

  // FIELD

  function seedClouds() {
    const W = G.W, H = G.H, S = G.S, rnd = G.rnd, cv = cover(), st = storm(), hz = clamp(F(G.T.haze, 0.55), 0, 1);
    const k = cv <= 0.4 ? cv / 0.4 : 1 + 1.3 * (cv - 0.4) / 0.6, cnt = (b) => (cv < 0.06 ? 0 : Math.max(1, Math.round(b * k)));
    const layers = [
      { depth: 0.46, count: 1 + Math.round(2 * cv), alpha: 0.34 + 0.24 * cv, speed: 0.004, ar: 0.26 },
      { depth: 0.20 * (1 + 0.5 * cv), count: cnt(5), alpha: hz * (0.7 + 0.3 * cv), speed: 0.006 },
      { depth: 0.34 * (1 + 0.4 * cv), count: cnt(4), alpha: 0.92, speed: 0.012 },
      { depth: 0.52 * (1 + 0.4 * cv + 0.32 * st), count: cnt(2), alpha: 1, speed: 0.022 },
    ];
    clouds = [];
    layers.forEach((L, li) => {
      for (let i = 0; i < L.count; i++) clouds.push({
        layer: li, sprite: Math.floor(rnd() * (li === 0 ? CSEED.length : SEED.length)), flip: rnd() < 0.5,
        x: rnd() * W * 1.4 - W * 0.2, y: rnd() * H * 1.2 - H * 0.1 + (li === 3 ? st * H * 0.12 : 0),
        w: S * L.depth * (0.85 + rnd() * 0.4), alpha: L.alpha, speed: L.speed, over: false, fl: 0, glow: 0,
      });
    });
    clouds.sort((a, b) => a.layer - b.layer);
  }

  function seedStars() {
    const rnd = G.rnd;
    stars = [];
    for (let i = 0; i < 300; i++) {
      const big = i < 14;
      stars.push({ x: rnd() * 1.18 - 0.09, y: rnd() * 1.18 - 0.09, r: big ? 1.2 + rnd() * 1.2 : 0.55 + rnd() * 0.75, a: big ? 0.8 + rnd() * 0.2 : 0.36 + rnd() * 0.44, phase: rnd() * TAU, speed: big ? 0.3 + rnd() * 0.45 : 0.08 + rnd() * 0.2, big });
    }
  }

  function build(resized) {
    paper = paper || makePaper();
    skyCache = makeSky();
    fogCache = makeFog();
    sprites = SEED.map(makeCloud);
    cirrus = CSEED.map(makeCirrus);
    queue = []; qt = 0;
    key = G.T.key;
    if (resized || !clouds.length) seedClouds();
    if (!stars.length) seedStars();
  }

  function step(dt) {
    const t = G.t, S = G.S, W = G.W, H = G.H, wind = G.wind, rnd = G.rnd, wk = F(G.T.windK, 1);
    if (G.T.key !== key) {
      key = G.T.key;
      if (!queue.length) {
        queue = [-1, -2];
        for (let i = 0; i < sprites.length; i++) queue.push(i);
        for (let i = 0; i < cirrus.length; i++) queue.push(100 + i);
      }
    }
    qt += dt;
    if (queue.length && qt > 0.3) {
      qt = 0;
      const i = queue.shift();
      if (i === -1) skyCache = makeSky(); else if (i === -2) fogCache = makeFog();
      else if (i >= 100) cirrus[i - 100] = makeCirrus(CSEED[i - 100]); else sprites[i] = makeCloud(SEED[i]);
    }
    const gust = 1 + 0.55 * noise(t * 0.06, 3), angle = 0.3 * noise(t * 0.025, 4);
    wind.x = Math.cos(angle) * gust * wk; wind.y = Math.sin(angle) * gust * wk;
    const [sx, sy] = Mood.sunAt();
    sunPt[0] = sx; sunPt[1] = sy;
    for (const c of clouds) {
      const sp = c.layer === 0 ? cirrus[c.sprite] : sprites[c.sprite], ar = sp ? sp.ar : 0.625, h = c.w * ar;
      c.x += wind.x * c.speed * S * dt; c.y += wind.y * c.speed * S * dt * 0.5;
      if (c.x > W + c.w * 0.1) { c.x = -c.w * 1.05; c.y = rnd() * H * 1.2 - H * 0.1; c.sprite = Math.floor(rnd() * (c.layer === 0 ? cirrus.length : sprites.length)); c.flip = rnd() < 0.5; }
      if (c.x < -c.w * 1.1) c.x = W + c.w * 0.05;
      if (c.y > H + h * 0.2) c.y = -h * 1.1; else if (c.y < -h * 1.2) c.y = H + h * 0.1;
      if (c.layer === 0) continue;
      const over = sx > c.x + c.w * 0.1 && sx < c.x + c.w * 0.9 && sy > c.y + h * 0.12 && sy < c.y + h * 0.86;
      if (over !== c.over) { c.over = over; c.fl = 0.001; }
      if (c.fl > 0) { c.fl += dt / 1.5; if (c.fl >= 1) c.fl = 0; }
      c.glow = c.fl > 0 ? Math.sin(Math.PI * c.fl) : 0;
    }
  }

  // PAINT

  function drawSky() {
    const { ctx, W, H } = G;
    ctx.drawImage(skyCache, -W * 0.08, -H * 0.08, W * 1.16, H * 1.16);
  }

  function drawStars() {
    const { ctx, W, H, t } = G, d = dark();
    if (d <= 0.02) return;
    ctx.fillStyle = mix(P.white, P.cyan, 0.08);
    for (const s of stars) {
      const tw = s.big ? 0.55 + 0.45 * (0.5 + 0.5 * Math.sin(t * s.speed + s.phase)) : 0.8 + 0.2 * Math.sin(t * s.speed + s.phase);
      ctx.globalAlpha = s.a * tw * d;
      ctx.beginPath(); ctx.arc(s.x * W, s.y * H, s.r, 0, TAU); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function drawMoon(pass) {
    const { ctx, T, S } = G, [mx, my] = sunPt, r = S * 0.036, d = dark();
    const p = clamp(F(T.moon, 0.5), 0, 1), ang = TAU * p, cs = Math.cos(ang), k = (1 - cs) / 2, wax = p < 0.5;
    const face = mix(mix(P.white, P.yellow, 0.1), T.light, 0.2), glowC = mix(P.white, P.indigo, 0.28);
    if (pass === 0) {
      ctx.save();
      const eg = ctx.createRadialGradient(mx, my, 0, mx, my, r);
      const ea = 0.05 + 0.34 * (1 - k) * (1 - k);
      eg.addColorStop(0, rgba(mix(face, T.mid, 0.55), ea)); eg.addColorStop(0.86, rgba(mix(face, T.mid, 0.6), ea * 0.72)); eg.addColorStop(1, rgba(mix(face, T.mid, 0.6), 0));
      ctx.fillStyle = eg; ctx.beginPath(); ctx.arc(mx, my, r, 0, TAU); ctx.fill();
      ctx.translate(mx, my); if (!wax) ctx.scale(-1, 1);
      ctx.beginPath();
      ctx.ellipse(0, 0, r, r, 0, -Math.PI / 2, Math.PI / 2, false);
      ctx.ellipse(0, 0, Math.abs(cs) * r, r, 0, Math.PI / 2, -Math.PI / 2, cs > 0);
      ctx.closePath();
      ctx.save(); ctx.clip();
      const fg = ctx.createRadialGradient(-r * 0.2, -r * 0.25, 0, 0, 0, r * 1.15);
      fg.addColorStop(0, rgba(face, 1)); fg.addColorStop(0.7, rgba(face, 0.96)); fg.addColorStop(1, rgba(mix(face, T.shade, 0.35), 0.9));
      ctx.fillStyle = fg; ctx.fillRect(-r, -r, r * 2, r * 2);
      const cr = rng(31);
      for (let i = 0; i < 7; i++) {
        const a = cr() * TAU, dd = Math.sqrt(cr()) * r * 0.78, rr = r * (0.09 + 0.16 * cr());
        const cg = ctx.createRadialGradient(Math.cos(a) * dd, Math.sin(a) * dd, 0, Math.cos(a) * dd, Math.sin(a) * dd, rr);
        const col = mix(T.shade, P.indigo, 0.35);
        cg.addColorStop(0, rgba(col, 0.16)); cg.addColorStop(0.7, rgba(col, 0.1)); cg.addColorStop(1, rgba(col, 0));
        ctx.fillStyle = cg; ctx.beginPath(); ctx.arc(Math.cos(a) * dd, Math.sin(a) * dd, rr, 0, TAU); ctx.fill();
      }
      ctx.restore(); ctx.restore();
    } else {
      ctx.save(); ctx.globalCompositeOperation = "screen";
      const hg = ctx.createRadialGradient(mx, my, r * 0.6, mx, my, r * 9);
      const ha = 0.34 * (0.25 + 0.75 * k) * d; hg.addColorStop(0, rgba(glowC, ha)); hg.addColorStop(0.18, rgba(glowC, ha * 0.5)); hg.addColorStop(0.42, rgba(glowC, ha * 0.18)); hg.addColorStop(0.72, rgba(glowC, ha * 0.05)); hg.addColorStop(1, rgba(glowC, 0));
      ctx.fillStyle = hg; ctx.beginPath(); ctx.arc(mx, my, r * 9, 0, TAU); ctx.fill();
      ctx.restore();
    }
  }

  function drawSun(pass) {
    const { ctx, T, W, H, S } = G;
    const [sx, sy] = Mood.sunAt();
    sunPt[0] = sx; sunPt[1] = sy;
    if (!T.sun) return drawMoon(pass);
    const e = elev(), lo = lowSun(), d = dark(), br = (1 - d * 0.8) * (1 - 0.85 * storm()) * (1 - 0.5 * clamp(F(T.fog, 0), 0, 1));
    const r = S * (0.036 + 0.02 * lo);
    const core = mix(P.white, P.yellow, 0.14 + 0.2 * lo), edge = mix(P.yellow, P.orange, 0.15 + 0.55 * lo);
    if (pass === 0) {
      const g = ctx.createRadialGradient(sx, sy, 0, sx, sy, r * 2.4);
      g.addColorStop(0, rgba(core, br)); g.addColorStop(0.4, rgba(mix(core, edge, 0.45), br));
      g.addColorStop(0.44, rgba(edge, 0.5 * br)); g.addColorStop(1, rgba(edge, 0));
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(sx, sy, r * 2.4, 0, TAU); ctx.fill();
    } else {
      let bloom = 0;
      for (const c of clouds) if (c.glow > bloom) bloom = c.glow;
      ctx.save(); ctx.globalCompositeOperation = "screen";
      const g = ctx.createRadialGradient(sx, sy, 0, sx, sy, r * 10);
      g.addColorStop(0, rgba(mix(edge, P.white, 0.55), (0.42 + 0.22 * lo) * br)); g.addColorStop(1, rgba(edge, 0));
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(sx, sy, r * 10, 0, TAU); ctx.fill();
      if (bloom > 0) {
        const bg = ctx.createRadialGradient(sx, sy, 0, sx, sy, r * 16);
        bg.addColorStop(0, rgba(mix(edge, P.white, 0.7), 0.3 * bloom * br)); bg.addColorStop(0.3, rgba(mix(edge, P.white, 0.4), 0.13 * bloom * br)); bg.addColorStop(1, rgba(edge, 0));
        ctx.fillStyle = bg; ctx.beginPath(); ctx.arc(sx, sy, r * 16, 0, TAU); ctx.fill();
      }
      for (const [k, a, rr] of [[0.5, 0.09, 0.45], [1.3, 0.06, 0.9], [1.65, 0.05, 0.3]]) {
        const gx = sx + (W / 2 - sx) * k, gy = sy + (H / 2 - sy) * k;
        ctx.fillStyle = rgba(mix(edge, P.white, 0.45), a * e * br);
        ctx.beginPath(); ctx.arc(gx, gy, r * rr, 0, TAU); ctx.fill();
      }
      ctx.restore();
    }
  }

  function paintCloud(c) {
    const { ctx } = G;
    const sp = c.layer === 0 ? cirrus[c.sprite] : sprites[c.sprite];
    if (!sp) return;
    const h = c.w * sp.ar, fx = c.flip ? -1 : 1, mx = G.W * 0.12, my = G.H * 0.12;
    if (c.x + c.w < -mx || c.x > G.W + mx || c.y + h < -my || c.y > G.H + my) return;
    ctx.save(); ctx.globalAlpha = c.alpha; ctx.translate(c.x + c.w / 2, c.y + h / 2);
    if (c.flip) ctx.scale(-1, 1);
    ctx.drawImage(sp.c, -c.w / 2, -h / 2, c.w, h);
    if (c.over || c.glow > 0) {
      const dx = sunPt[0] - (c.x + c.w / 2), dy = sunPt[1] - (c.y + h / 2), m = Math.hypot(dx, dy) || 1;
      const ox = (dx / m) * c.w * 0.022 * fx, oy = (dy / m) * c.w * 0.022;
      ctx.globalCompositeOperation = "screen";
      ctx.globalAlpha = c.alpha * (1 - dark() * 0.55) * (c.over ? 0.16 : 0) + c.glow * 0.2;
      ctx.drawImage(sp.c, -c.w / 2 + ox, -h / 2 + oy, c.w, h);
    }
    ctx.restore();
  }

  function drawFog() {
    const { ctx, W, H } = G, f = fog();
    if (f <= 0.01) return;
    ctx.save(); ctx.globalAlpha = 0.5 * f;
    ctx.drawImage(fogCache, -W * 0.08, -H * 0.08, W * 1.16, H * 1.16);
    ctx.restore();
  }

  function draw(pass) {
    if (pass === 1) { for (const c of clouds) if (c.layer === 3) paintCloud(c); return; }
    for (const c of clouds) if (c.layer < 2) paintCloud(c);
    drawFog();
    for (const c of clouds) if (c.layer === 2) paintCloud(c);
  }

  return { build, step, drawSky, drawStars, drawSun, draw, clouds: () => clouds };
})();
