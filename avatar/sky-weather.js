const Weather = (() => {
  const { TAU, clamp, smooth, noise, mix, rgba, P } = Core;

  // HOOKS

  const Q = new URLSearchParams(location.search);
  const hook = (k) => (Q.has(k) ? clamp(+Q.get(k) || 1, 0, 1) : 0);
  const HK = { rain: hook("rain"), snow: hook("snow"), storm: hook("storm"), fog: hook("fog"), leaves: hook("leaves"), dust: hook("dust") };
  const HSEASON = Q.get("season") || (HK.leaves > 0 ? "autumn" : "");

  const MAXRAIN = 240, MAXSNOW = 280, MAXCARRY = 30, MAXLENS = 12, MAXGUST = 8;
  const rainP = [], snowP = [], carry = [], lens = [], gusts = [];
  const boltPts = [], boltBr = [];
  const flash = { on: 0, k: 0, dur: 1, next: 5, amp: 1, bolt: 0, x: 0, y: 0, armed: 0 };
  const F = [0.72, 1, 0.8, 0.5];
  let leafS = [], petalS = [], summerS = [], dustS = [], flakeS = [], dropS = [], seedS = null;
  let rainN = 0, snowN = 0, carryN = 0, wet = 0, sprites = 0, rainKey = "";
  const rainCol = [[], []];

  // SPRITES

  function soften(src, px) {
    const c = document.createElement("canvas"); c.width = src.width; c.height = src.height;
    const g = c.getContext("2d"), o = [[-px, 0], [px, 0], [0, -px], [0, px], [0, 0]], a = [0.21, 0.21, 0.21, 0.21, 0.38];
    for (let i = 0; i < 5; i++) { g.globalAlpha = a[i]; g.drawImage(src, o[i][0] * 2, o[i][1] * 2); }
    return c;
  }

  function makeFlake(soft) {
    const R = 28, c = document.createElement("canvas"); c.width = c.height = R * 2;
    const g = c.getContext("2d"), rg = g.createRadialGradient(R, R, 0, R, R, R);
    if (soft) { rg.addColorStop(0, rgba(P.white, 0.62)); rg.addColorStop(0.34, rgba(P.white, 0.34)); rg.addColorStop(0.72, rgba(P.white, 0.09)); rg.addColorStop(1, rgba(P.white, 0)); }
    else { rg.addColorStop(0, rgba(P.white, 0.96)); rg.addColorStop(0.4, rgba(P.white, 0.7)); rg.addColorStop(0.72, rgba(P.white, 0.16)); rg.addColorStop(1, rgba(P.white, 0)); }
    g.fillStyle = rg; g.fillRect(0, 0, R * 2, R * 2);
    return c;
  }

  function makeDrop(R) {
    const D = R * 2, c = document.createElement("canvas"); c.width = c.height = D * 2;
    const g = c.getContext("2d"); g.scale(2, 2);
    g.save(); g.beginPath(); g.arc(R, R, R * 0.95, 0, TAU); g.clip();
    let rg = g.createRadialGradient(R, R, 0, R, R, R);
    rg.addColorStop(0, rgba(P.black, 0.11)); rg.addColorStop(0.6, rgba(P.black, 0.05)); rg.addColorStop(0.9, rgba(P.white, 0.07)); rg.addColorStop(1, rgba(P.white, 0));
    g.fillStyle = rg; g.fillRect(0, 0, D, D);
    rg = g.createRadialGradient(R * 1.3, R * 1.34, R * 0.04, R * 1.22, R * 1.26, R * 0.95);
    rg.addColorStop(0, rgba(P.white, 0.5)); rg.addColorStop(0.45, rgba(P.white, 0.15)); rg.addColorStop(1, rgba(P.white, 0));
    g.fillStyle = rg; g.fillRect(0, 0, D, D);
    g.lineWidth = R * 0.22;
    g.strokeStyle = rgba(P.white, 0.3); g.beginPath(); g.arc(R, R, R * 0.8, 0.45, 1.75); g.stroke();
    g.strokeStyle = rgba(P.black, 0.1); g.beginPath(); g.arc(R, R, R * 0.8, 3.6, 4.9); g.stroke();
    g.fillStyle = rgba(P.white, 0.5); g.beginPath(); g.ellipse(R * 0.68, R * 0.62, R * 0.15, R * 0.1, -0.6, 0, TAU); g.fill();
    g.restore();
    return soften(c, 1.6);
  }

  function makeLeaf(shape, col) {
    const W = 30, c = document.createElement("canvas"); c.width = c.height = W * 2;
    const g = c.getContext("2d"); g.scale(2, 2); g.translate(W / 2, W / 2);
    g.beginPath();
    if (shape === 0) { g.moveTo(0, -11); g.bezierCurveTo(7, -6, 8, 5, 0, 12); g.bezierCurveTo(-8, 5, -7, -6, 0, -11); }
    else if (shape === 1) { g.moveTo(0, -10); g.bezierCurveTo(9, -9, 11, 3, 1, 11); g.bezierCurveTo(-6, 6, -11, -2, 0, -10); }
    else { g.moveTo(1, -12); g.bezierCurveTo(6, -4, 5, 6, -2, 12); g.bezierCurveTo(-5, 4, -4, -5, 1, -12); }
    const lg = g.createLinearGradient(-8, -11, 8, 12);
    lg.addColorStop(0, mix(col, P.yellow, 0.38)); lg.addColorStop(1, mix(col, P.brown, 0.5));
    g.fillStyle = lg; g.fill();
    g.strokeStyle = rgba(mix(col, P.brown, 0.65), 0.5); g.lineWidth = 0.8;
    g.beginPath(); g.moveTo(0, -10); g.lineTo(0, 11); g.stroke();
    return soften(c, 0.85);
  }

  function makePetal(col) {
    const W = 22, c = document.createElement("canvas"); c.width = c.height = W * 2;
    const g = c.getContext("2d"); g.scale(2, 2); g.translate(W / 2, W / 2);
    g.beginPath(); g.moveTo(0, -8); g.bezierCurveTo(7, -5, 6, 6, 0, 9); g.bezierCurveTo(-6, 6, -7, -5, 0, -8);
    const lg = g.createLinearGradient(-6, -8, 6, 9);
    lg.addColorStop(0, mix(col, P.white, 0.6)); lg.addColorStop(1, col);
    g.fillStyle = lg; g.fill();
    return soften(c, 0.9);
  }

  function makeMote(col, a) {
    const R = 16, c = document.createElement("canvas"); c.width = c.height = R * 2;
    const g = c.getContext("2d"), rg = g.createRadialGradient(R, R, 0, R, R, R);
    rg.addColorStop(0, rgba(col, a)); rg.addColorStop(0.38, rgba(col, a * 0.45)); rg.addColorStop(1, rgba(col, 0));
    g.fillStyle = rg; g.fillRect(0, 0, R * 2, R * 2);
    return c;
  }

  function makeSeed() {
    const W = 26, c = document.createElement("canvas"); c.width = c.height = W * 2;
    const g = c.getContext("2d"); g.scale(2, 2); g.translate(W / 2, W / 2);
    g.strokeStyle = rgba(mix(P.white, P.yellow, 0.16), 0.5); g.lineWidth = 0.7;
    for (let i = 0; i < 9; i++) { const a = -Math.PI / 2 + (i - 4) * 0.2; g.beginPath(); g.moveTo(0, 1); g.lineTo(Math.cos(a) * 9, Math.sin(a) * 9); g.stroke(); }
    g.strokeStyle = rgba(mix(P.brown, P.white, 0.4), 0.55); g.beginPath(); g.moveTo(0, 1); g.lineTo(0, 9); g.stroke();
    g.fillStyle = rgba(mix(P.brown, P.white, 0.25), 0.7); g.beginPath(); g.arc(0, 9.6, 1.1, 0, TAU); g.fill();
    return soften(c, 0.7);
  }

  function makeSprites() {
    flakeS = [makeFlake(0), makeFlake(1)];
    dropS = [makeDrop(11), makeDrop(17), makeDrop(26)];
    leafS = [];
    for (const col of [P.orange, P.red, mix(P.orange, P.brown, 0.45)]) for (let s = 0; s < 3; s++) leafS.push(makeLeaf(s, col));
    petalS = [makePetal(mix(P.pink, P.white, 0.72)), makePetal(mix(P.pink, P.white, 0.55)), makeMote(mix(P.yellow, P.white, 0.55), 0.5)];
    seedS = makeSeed();
    summerS = [seedS, seedS, makeMote(mix(P.yellow, P.white, 0.6), 0.45), makeMote(mix(P.white, P.orange, 0.2), 0.4)];
    dustS = [makeMote(P.white, 0.5), makeMote(mix(P.white, P.cyan, 0.2), 0.45)];
    sprites = 1;
  }

  // FIELDS

  function resetRain(p, spread) {
    p.a = G.rnd() * TAU;
    p.r = spread ? G.rnd() * 0.98 : G.rnd() * 0.1;
    p.d = G.rnd() < 0.4 ? 1 : 0;
    p.sp = p.d ? 0.95 + G.rnd() * 0.8 : 0.5 + G.rnd() * 0.42;
    p.w = 0.7 + G.rnd() * 0.6;
    p.tw = (G.rnd() - 0.5) * 0.5;
    p.off = (G.rnd() - 0.5) * 0.06;
    p.b = 0;
  }

  function resetSnow(p, spread) {
    p.x = G.rnd() * G.W; p.y = G.rnd() * G.H;
    p.z = spread ? G.rnd() : G.rnd() * 0.12;
    p.zs = 0.035 + G.rnd() * 0.1;
    p.w = 0.5 + G.rnd() * 1.4; p.ph = G.rnd() * TAU;
    p.soft = G.rnd() < 0.45 ? 1 : 0;
    p.g = 0.55 + G.rnd() * 0.5;
  }

  function resetCarry(p, spread) {
    const W = G.W, H = G.H;
    p.z = G.rnd();
    p.k = G.rnd();
    p.rot = G.rnd() * TAU; p.spin = (G.rnd() - 0.5) * 2;
    p.f = 0.5 + G.rnd() * 1.6; p.ph = G.rnd() * TAU;
    p.dx = (G.rnd() - 0.5) * 0.04; p.dy = 0.02 + G.rnd() * 0.07;
    p.y = spread ? G.rnd() * H : G.rnd() * H * 1.1 - H * 0.05;
    p.x = spread ? G.rnd() * W : (G.wind.x >= 0 ? -G.S * 0.05 : W + G.S * 0.05);
  }

  function seedFields() {
    rainP.length = snowP.length = carry.length = 0;
    for (let i = 0; i < MAXRAIN; i++) { const p = {}; resetRain(p, true); rainP.push(p); }
    for (let i = 0; i < MAXSNOW; i++) { const p = {}; resetSnow(p, true); snowP.push(p); }
    for (let i = 0; i < MAXCARRY; i++) { const p = {}; resetCarry(p, true); carry.push(p); }
    lens.length = 0; gusts.length = 0;
  }

  function build(resized) {
    if (!sprites) makeSprites();
    if (resized || !rainP.length) seedFields();
    rainKey = "";
  }

  // LOOK

  function look() {
    const T = G.T;
    let mine = 0;
    for (const k in HK) if (HK[k] > 0 && !(T[k] > 0)) { T[k] = HK[k]; if (k === "leaves") mine = 1; }
    if (HK.storm > 0 && T.storm > 0) {
      if (!(T.rain > 0)) T.rain = 0.5 + 0.35 * T.storm;
      if (!(T.windK > 1)) T.windK = 1 + 1.1 * T.storm;
    }
    if (Q.get("season")) T.season = HSEASON;
    else if (mine) T.season = "autumn";
    return T;
  }

  function carrierSet(T) {
    if (T.season === "autumn") return { s: leafS, n: Math.round(3 + T.leaves * 15 + T.dust * 4), sz: 0.03, spin: 2.4, a: 0.95 };
    if (T.season === "spring") return { s: petalS, n: Math.round(3 + T.leaves * 12 + T.dust * 8), sz: 0.021, spin: 1.7, a: 0.9 };
    if (T.season === "winter") return { s: dustS, n: T.snow > 0.02 ? 0 : Math.round(2 + T.dust * 20), sz: 0.009, spin: 0.5, a: 0.5 };
    return { s: summerS, n: Math.round(3 + T.dust * 15), sz: 0.016, spin: 1, a: 0.5 };
  }

  // STEP

  function stepLens(dt, T) {
    const H = G.H, S = G.S;
    wet = Math.max(T.rain, wet - dt * 0.035);
    if (lens.length < MAXLENS && G.rnd() < dt * (3.2 * T.rain + 0.5 * wet * wet))
      lens.push({ x: G.rnd() * G.W, y: G.rnd() * H * 0.92, s: G.rnd() < 0.5 ? 0 : G.rnd() < 0.6 ? 1 : 2, k: G.rnd(), run: 0, vy: 0, ty: 0, wait: 0.6 + G.rnd() * 6, age: 0, life: 9 + G.rnd() * 16, a: 0 });
    for (let i = lens.length - 1; i >= 0; i--) {
      const p = lens[i];
      p.age += dt;
      p.a = Math.min(1, p.a + dt * 3) * (1 - smooth((p.age - p.life) / 2.5));
      if (!p.run) { p.wait -= dt; if (p.wait <= 0) { p.run = 1; p.ty = p.y; } }
      else {
        p.vy = Math.min(S * (0.06 + 0.3 * p.k) * (0.6 + p.s * 0.5), p.vy + dt * S * 0.35);
        if (G.rnd() < dt * 1.2) p.vy *= 0.22;
        p.y += p.vy * dt;
        p.ty += (p.y - p.ty) * dt * 1.8;
        p.ty = Math.max(p.ty, p.y - S * 0.085);
      }
      if (p.a <= 0.001 && p.age > 1 || p.y > H + S * 0.06) lens.splice(i, 1);
    }
  }

  function stepStorm(dt, T) {
    if (T.storm <= 0.01) { flash.on = 0; flash.armed = 0; return; }
    if (!flash.armed) { flash.armed = 1; flash.next = 1 + G.rnd() * 4; }
    if (flash.on) { flash.k += dt; if (flash.k > flash.dur) flash.on = 0; return; }
    flash.next -= dt * (0.55 + T.storm);
    if (flash.next > 0) return;
    flash.on = 1; flash.k = 0; flash.dur = 0.55 + G.rnd() * 0.4;
    flash.next = 6 + G.rnd() * 14;
    flash.amp = 0.5 + 0.5 * T.storm;
    flash.x = G.W * (G.rnd() < 0.5 ? 0.08 + G.rnd() * 0.2 : 0.7 + G.rnd() * 0.24);
    flash.y = G.H * (0.06 + G.rnd() * 0.46);
    flash.bolt = G.rnd() < 0.5 ? 1 : 0;
    if (flash.bolt) makeBolt();
  }

  function makeBolt() {
    const S = G.S, dir = flash.x < G.W * 0.5 ? 1 : -1;
    let x = flash.x, y = flash.y * 0.35;
    boltPts.length = 0; boltBr.length = 0;
    boltPts.push(x, y);
    const n = 3 + Math.floor(G.rnd() * 4);
    for (let i = 0; i < n; i++) {
      x += dir * S * (0.02 + G.rnd() * 0.07) * (G.rnd() < 0.28 ? -1 : 1);
      y += S * (0.05 + G.rnd() * 0.1);
      boltPts.push(x, y);
    }
    for (let i = 0, m = 1 + Math.floor(G.rnd() * 2); i < m; i++) {
      const j = 1 + Math.floor(G.rnd() * n), bx = boltPts[j * 2], by = boltPts[j * 2 + 1];
      boltBr.push(bx, by, bx + dir * S * (0.04 + G.rnd() * 0.08), by + S * (0.035 + G.rnd() * 0.07));
    }
  }

  function bump(k, at, w) { const u = (k - at) / w; return Math.exp(-u * u); }

  function env() {
    if (!flash.on) return 0;
    const k = flash.k / flash.dur;
    const e = bump(k, 0.03, 0.06) + 0.72 * bump(k, 0.2, 0.07) + 0.46 * bump(k, 0.44, 0.1) + 0.17 * Math.exp(-k * 3);
    return clamp(e, 0, 1.15) * flash.amp;
  }

  function step(dt) {
    const T = look(), W = G.W, H = G.H, S = G.S;
    const wx = G.wind.x, wy = G.wind.y;

    rainN = Math.round(clamp(T.rain, 0, 1) * MAXRAIN);
    for (let i = 0; i < rainN; i++) {
      const p = rainP[i];
      p.r += dt * p.sp * (0.15 + p.r * 1.55);
      if (p.r > 1.05) resetRain(p, false);
      p.b = clamp(Math.floor(p.r * 4), 0, 3);
    }

    snowN = Math.round(clamp(T.snow, 0, 1) * MAXSNOW);
    for (let i = 0; i < snowN; i++) {
      const p = snowP[i];
      p.z += dt * p.zs;
      const k = 0.03 + 0.12 * p.z;
      p.x += (wx * S * k + (p.x - W * 0.5) * 0.09 * p.z) * dt;
      p.y += (wy * S * k * 0.6 + S * (0.012 + 0.05 * p.z) + (p.y - H * 0.5) * 0.09 * p.z) * dt;
      if (p.z > 1 || p.x < -S * 0.06 || p.x > W + S * 0.06 || p.y < -S * 0.06 || p.y > H + S * 0.06) resetSnow(p, false);
    }

    const set = carrierSet(T);
    carryN = Math.min(MAXCARRY, set.n);
    const gustK = 1 + 0.9 * smooth((Math.hypot(wx, wy) - 1.05) / 0.5);
    for (let i = 0; i < carryN; i++) {
      const p = carry[i], k = (0.09 + 0.24 * p.z) * gustK;
      p.x += (wx * S * k + p.dx * S) * dt;
      p.y += (wy * S * k + p.dy * S * 0.35 + Math.sin(G.t * p.f + p.ph) * S * 0.04) * dt;
      p.rot += p.spin * set.spin * dt * (0.4 + 0.6 * gustK);
      const m = S * 0.11;
      if (p.x < -m || p.x > W + m || p.y < -m || p.y > H + m) resetCarry(p, false);
    }

    if (Math.hypot(wx, wy) > 1.3 && gusts.length < MAXGUST && G.rnd() < dt * 5)
      gusts.push({ x: G.rnd() * W, y: G.rnd() * H, len: S * (0.18 + G.rnd() * 0.3), age: 0, life: 0.8 + G.rnd() * 0.6, k: 0.5 + G.rnd() * 0.6 });
    for (let i = gusts.length - 1; i >= 0; i--) {
      const p = gusts[i];
      p.age += dt; p.x += wx * S * 0.14 * dt; p.y += wy * S * 0.14 * dt;
      if (p.age > p.life) gusts.splice(i, 1);
    }

    stepStorm(dt, T);
    stepLens(dt, T);
  }

  // PAINT

  function rainColors(T) {
    const k = T.key + "|" + Math.round(T.rain * 8);
    if (k === rainKey) return;
    rainKey = k;
    const far = mix(P.white, T.mid, 0.5), near = mix(P.white, T.mid, 0.26);
    for (let b = 0; b < 4; b++) {
      rainCol[0][b] = rgba(far, (0.07 + 0.11 * T.rain) * F[b]);
      rainCol[1][b] = rgba(near, (0.1 + 0.18 * T.rain) * F[b]);
    }
  }

  function drawRain(T) {
    const { ctx, W, H, S, t } = G;
    rainColors(T);
    const maxR = Math.hypot(W, H) * 0.6;
    const wx = G.wind.x, wy = G.wind.y;
    const vx = W * 0.5 + S * 0.05 * noise(t * 0.05, 21) - wx * S * 0.05;
    const vy = H * 0.47 + S * 0.04 * noise(t * 0.05, 22) - wy * S * 0.04;
    ctx.lineCap = "round";
    for (let d = 0; d < 2; d++) {
      ctx.lineWidth = d ? 1.7 : 0.9;
      for (let b = 0; b < 4; b++) {
        ctx.beginPath();
        let any = 0;
        for (let i = 0; i < rainN; i++) {
          const p = rainP[i];
          if (p.d !== d || p.b !== b) continue;
          const c = Math.cos(p.a), s = Math.sin(p.a), r0 = p.r * maxR;
          const dc = Math.cos(p.a + p.tw), ds = Math.sin(p.a + p.tw);
          const len = maxR * (0.018 + 0.062 * p.r) * (d ? 1.35 : 0.8) * p.w;
          const ox = wx * maxR * 0.13 * p.r + -s * maxR * p.off, oy = wy * maxR * 0.13 * p.r + c * maxR * p.off;
          ctx.moveTo(vx + c * r0 + ox, vy + s * r0 + oy);
          ctx.lineTo(vx + c * r0 + dc * len + ox, vy + s * r0 + ds * len + oy);
          any = 1;
        }
        if (any) { ctx.strokeStyle = rainCol[d][b]; ctx.stroke(); }
      }
    }
    ctx.lineCap = "butt";
  }

  function drawSnow() {
    const { ctx, W, H, S, t } = G;
    for (let i = 0; i < snowN; i++) {
      const p = snowP[i], z = p.z;
      const sz = S * (0.004 + 0.028 * z * z);
      const a = (0.32 + 0.52 * z) * p.g * (1 - smooth((z - 0.84) / 0.16)) * (1 - smooth((0.07 - z) / 0.07));
      if (a <= 0.004) continue;
      const dx = Math.sin(t * p.w + p.ph) * S * 0.014 * z, dy = Math.cos(t * p.w * 0.7 + p.ph) * S * 0.008 * z;
      ctx.globalAlpha = a;
      ctx.drawImage(flakeS[p.soft || z > 0.6 ? 1 : 0], p.x + dx - sz, p.y + dy - sz, sz * 2, sz * 2);
    }
    ctx.globalAlpha = 1;
  }

  function drawCarriers(T) {
    const { ctx, S } = G, set = carrierSet(T), n = set.s.length;
    if (!n) return;
    const dim = 1 - 0.55 * T.dark;
    for (let i = 0; i < carryN; i++) {
      const p = carry[i], sp = set.s[Math.floor(p.k * n) % n];
      const sz = S * set.sz * (0.5 + 1.05 * p.z);
      ctx.save();
      ctx.globalAlpha = set.a * (1 - 0.3 * p.z) * dim;
      ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.scale(1, 0.55 + 0.45 * Math.cos(p.rot * 1.7));
      ctx.drawImage(sp, -sz, -sz, sz * 2, sz * 2);
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  }

  function drawGusts(T) {
    const { ctx, S } = G;
    if (!gusts.length) return;
    const wx = G.wind.x, wy = G.wind.y, m = Math.hypot(wx, wy) || 1;
    const ux = wx / m, uy = wy / m;
    ctx.strokeStyle = rgba(mix(P.white, T.mid, 0.3), 1);
    ctx.lineCap = "round";
    for (const p of gusts) {
      const a = Math.sin(Math.PI * clamp(p.age / p.life, 0, 1)) * 0.11 * p.k;
      ctx.globalAlpha = a; ctx.lineWidth = 1 + p.k;
      ctx.beginPath();
      ctx.moveTo(p.x - ux * p.len * 0.5, p.y - uy * p.len * 0.5);
      ctx.lineTo(p.x + ux * p.len * 0.5, p.y + uy * p.len * 0.5);
      ctx.stroke();
    }
    ctx.globalAlpha = 1; ctx.lineCap = "butt";
  }

  function drawLens() {
    const { ctx, S } = G;
    for (const p of lens) {
      if (p.a <= 0.004) continue;
      const r = S * (0.009 + 0.008 * p.s) * (0.85 + 0.3 * p.k);
      if (p.run && p.y - p.ty > 2) {
        const g = ctx.createLinearGradient(p.x, p.ty, p.x, p.y);
        g.addColorStop(0, rgba(P.white, 0)); g.addColorStop(0.65, rgba(P.white, 0.05 * p.a)); g.addColorStop(1, rgba(P.white, 0.14 * p.a));
        ctx.strokeStyle = g; ctx.lineWidth = r * 0.34;
        ctx.beginPath(); ctx.moveTo(p.x, p.ty); ctx.lineTo(p.x, p.y); ctx.stroke();
      }
      ctx.globalAlpha = p.a * 0.85;
      ctx.drawImage(dropS[p.s], p.x - r, p.y - r * 1.12, r * 2, r * 2.24);
    }
    ctx.globalAlpha = 1;
  }

  function drawFlash(T, pass) {
    const e = env();
    if (e <= 0.004) return;
    const { ctx, W, H, S } = G;
    const col = mix(P.white, T.sun ? P.cyan : P.indigo, 0.28);
    ctx.save();
    ctx.globalCompositeOperation = "screen";
    if (pass === 0) {
      const g = ctx.createRadialGradient(flash.x, flash.y, 0, flash.x, flash.y, Math.hypot(W, H) * 0.95);
      g.addColorStop(0, rgba(col, 0.8 * e)); g.addColorStop(0.4, rgba(col, 0.34 * e)); g.addColorStop(1, rgba(col, 0));
      ctx.fillStyle = g; ctx.fillRect(-W * 0.12, -H * 0.12, W * 1.24, H * 1.24);
      if (flash.bolt && flash.k < 0.13) {
        const ba = clamp(1 - flash.k / 0.13, 0, 1);
        ctx.lineCap = "round"; ctx.lineJoin = "round";
        for (const [lw, al] of [[S * 0.012, 0.16], [1.5, 0.92]]) {
          ctx.lineWidth = lw; ctx.strokeStyle = rgba(mix(P.white, P.cyan, 0.12), al * ba);
          ctx.beginPath();
          ctx.moveTo(boltPts[0], boltPts[1]);
          for (let i = 2; i < boltPts.length; i += 2) ctx.lineTo(boltPts[i], boltPts[i + 1]);
          for (let i = 0; i < boltBr.length; i += 4) { ctx.moveTo(boltBr[i], boltBr[i + 1]); ctx.lineTo(boltBr[i + 2], boltBr[i + 3]); }
          ctx.stroke();
        }
        ctx.lineCap = "butt"; ctx.lineJoin = "miter";
      }
    } else {
      ctx.fillStyle = rgba(col, 0.09 * e);
      ctx.fillRect(-W * 0.12, -H * 0.12, W * 1.24, H * 1.24);
    }
    ctx.restore();
  }

  function draw(pass) {
    const T = G.T, { ctx, W, H } = G;
    if (pass === 0) { if (T.storm > 0.01) drawFlash(T, 0); return; }
    if (pass === 1) {
      const veil = T.rain * 0.05 + T.fog * 0.1;
      if (veil > 0.004) { ctx.fillStyle = rgba(mix(T.mid, P.gray, 0.4), veil); ctx.fillRect(-W * 0.12, -H * 0.12, W * 1.24, H * 1.24); }
      if (T.storm > 0.01) drawFlash(T, 1);
      if (rainN) drawRain(T);
      if (snowN) drawSnow();
      drawCarriers(T);
      drawGusts(T);
      return;
    }
    if (lens.length) drawLens();
  }

  return { build, step, draw };
})();
