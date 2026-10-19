const Weather = (() => {
  const { TAU, clamp, smooth, noise, rng, mix, rgba, P } = Core;

  /* HOOKS */

  const Q = new URLSearchParams(location.search);
  const hook = (k) => (Q.has(k) ? clamp(+Q.get(k) || 1, 0, 1) : 0);
  const HK = { rain: hook("rain"), snow: hook("snow"), storm: hook("storm"), fog: hook("fog"), leaves: hook("leaves"), dust: hook("dust") };
  const HSEASON = Q.get("season") || (HK.leaves > 0 ? "autumn" : "");

  const MAXRAIN = 420, MAXSNOW = 280, MAXCARRY = 34, MAXMOTE = 72, MAXLENS = 5, MAXBEAD = 18, MAXRIB = 6, NP = 80;
  const rainP = [], snowP = [], carry = [], motes = [], lens = [], beads = [], gusts = [], ribs = [], bolt = [];
  const A = { t: -1, ux: 1, uy: 0, base: 1, wk: 1, ox: 0, oy: 0, next: 6, g: 0, m: 1 };
  const fl = { x: 1, y: 0, g: 0 };
  const sun = { x: 0, y: 0, k: 1, dk: 1 };
  const M = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };
  const flash = { on: 0, k: 0, dur: 1, next: 5, amp: 1, x: 0, y: 0, r: 1, armed: 0, n: 0, bd: 0, pk: [0, 0, 0, 0], pa: [0, 0, 0, 0], pw: [0, 0, 0, 0] };
  const RX = new Float32Array(NP + 2), RY = new Float32Array(NP + 2), NX = new Float32Array(NP + 2), NY = new Float32Array(NP + 2), WW = new Float32Array(NP + 2), OO = new Float32Array(NP + 2);
  const DV = [0.7, 1, 1.35], DX = [0.06, 0.068, 0.085], DW = [0.75, 1.05, 2.6], DA = [0.7, 0.72, 0.2];
  const RQ = new Float32Array(MAXRAIN * 6);
  const BW = [[14, 9, 6], [4.5, 3, 2], [1.3, 0.8, 0.5]], BA = [0.035, 0.12, 0.9];
  const KIND = {
    autumn: { sz: 0.026, resp: 1.4, drift: 1, sway: 0.03, ff: 1, spin: 1.6, flip: 1.4, rock: 0.9, a: 1 },
    spring: { sz: 0.019, resp: 2.2, drift: 0.9, sway: 0.035, ff: 1.5, spin: 2.2, flip: 2.4, rock: 1.2, a: 0.95 },
    summer: { sz: 0.027, resp: 3, drift: 0.7, sway: 0.015, ff: 0.6, spin: 0.4, flip: 0, rock: 0.3, a: 0.8 },
  };
  let SP = null, buf = null, bufG = null, bufN = 0, rainLk = 0, tintKey = "", ribCol = "", ribHalo = "", boltCol = "", liftCol = "", veilCol = "";
  let rainN = 0, snowN = 0, carryN = 0, moteN = 0, wet = 0, ffK = 0, ribT = -1, dn = 1;
  G.flash = { e: 0, x: 0, y: 0, r: 0 };

  /* SPRITES */

  const cv = (w, h) => { const c = document.createElement("canvas"); c.width = w; c.height = h || w; return c; };
  const GAUSS = [0, 1, 0.2, 0.84, 0.4, 0.5, 0.6, 0.2, 0.8, 0.05, 1, 0];
  const HARD = [0, 1, 0.22, 0.9, 0.45, 0.45, 0.7, 0.12, 1, 0];
  const BOKEH = [0, 0.5, 0.5, 0.46, 0.78, 0.34, 0.92, 0.12, 1, 0];
  const FLAKE = [0, 1, 0.3, 0.86, 0.6, 0.36, 0.82, 0.08, 1, 0];
  const U = 30, C = 80, B = C / 2 / U, DARK = mix(mix(P.indigo, P.gray, 0.5), P.black, 0.55);

  function disc(c, stops, col) {
    const R = c.width / 2, g = c.getContext("2d"), rg = g.createRadialGradient(R, R, 0, R, R, R);
    for (let i = 0; i < stops.length; i += 2) rg.addColorStop(stops[i], rgba(col, stops[i + 1]));
    g.clearRect(0, 0, R * 2, R * 2); g.fillStyle = rg; g.fillRect(0, 0, R * 2, R * 2);
    return c;
  }

  function blur(src, px, n) {
    let s = src;
    for (let k = 0; k < n; k++) {
      const c = cv(s.width, s.height), g = c.getContext("2d"), o = px * (1 + k * 0.7);
      g.globalCompositeOperation = "lighter"; g.globalAlpha = 0.2; g.drawImage(s, 0, 0); g.globalAlpha = 0.1;
      for (let i = 0; i < 8; i++) g.drawImage(s, Math.cos(i * TAU / 8 + k) * o, Math.sin(i * TAU / 8 + k) * o);
      s = c;
    }
    return s;
  }

  function sprite(paint) {
    const c = cv(C), g = c.getContext("2d");
    g.translate(C / 2, C / 2); g.scale(U, U); g.lineCap = "round"; g.lineJoin = "round";
    paint(g);
    return c;
  }

  const MAPLE = [[0, 1, 0.78], [1.22, 0.92, 0.74], [-1.22, 0.92, 0.74], [2.3, 0.56, 0.6], [-2.3, 0.56, 0.6]];

  function maple(q) {
    let r = 0.3;
    for (const [c, l, w] of MAPLE) {
      let d = Math.abs(q - c);
      if (d > Math.PI) d = TAU - d;
      const x = d / w;
      if (x >= 1) continue;
      const teeth = 0.12 * Math.pow(Math.abs(Math.sin(x * Math.PI * 2)), 8) * (1 - x * 0.6);
      r = Math.max(r, l * (Math.pow(1 - x, 0.6) * (1 - 0.3 * Math.sqrt(x)) + teeth));
    }
    return r;
  }

  function leafPath(g, s) {
    g.beginPath();
    if (s === 0) {
      for (let i = 0; i <= 240; i++) {
        const q = (i / 240) * TAU - Math.PI, a = q - Math.PI / 2, r = maple(q) * 1.05;
        const x = Math.cos(a) * r, y = Math.sin(a) * r + 0.18;
        i ? g.lineTo(x, y) : g.moveTo(x, y);
      }
    } else if (s === 1) {
      g.moveTo(0, -1); g.bezierCurveTo(0.42, -0.72, 0.66, -0.12, 0.44, 0.48); g.quadraticCurveTo(0.24, 0.86, 0, 0.86);
      g.quadraticCurveTo(-0.24, 0.86, -0.44, 0.48); g.bezierCurveTo(-0.66, -0.12, -0.42, -0.72, 0, -1);
    } else if (s === 2) {
      const hw = (u, o) => 0.56 * Math.pow(Math.sin(Math.PI * u), 0.7) * (0.6 + 0.4 * Math.pow(Math.abs(Math.sin((u + o) * 4.5 * Math.PI)), 0.6));
      for (let i = 0; i <= 60; i++) { const u = i / 60; g.lineTo(-hw(u, 0), -0.95 + 1.72 * u); }
      for (let i = 60; i >= 0; i--) { const u = i / 60; g.lineTo(hw(u, 0.05), -0.95 + 1.72 * u); }
    } else {
      g.moveTo(0, 0.72);
      for (let i = 0; i <= 60; i++) {
        const u = i / 60, a = -Math.PI / 2 + (u - 0.5) * 1.75, n = Math.exp(-Math.pow((u - 0.5) / 0.04, 2));
        const r = 1.5 * (1 - 0.16 * n) * (1 + 0.018 * Math.sin(u * 40));
        g.lineTo(Math.cos(a) * r, 0.72 + Math.sin(a) * r);
      }
    }
    g.closePath();
  }

  function veins(g, s) {
    g.beginPath();
    if (s === 0) { for (const [c, l] of MAPLE) { const a = c - Math.PI / 2; g.moveTo(0, 0.18); g.lineTo(Math.cos(a) * l * 0.92, Math.sin(a) * l * 0.92 + 0.18); } }
    else if (s === 3) { for (let k = 0; k < 9; k++) { const a = -Math.PI / 2 + (k / 8 - 0.5) * 1.6; g.moveTo(0, 0.72); g.lineTo(Math.cos(a) * 1.3, 0.72 + Math.sin(a) * 1.3); } }
    else {
      g.moveTo(0, -0.9); g.lineTo(0, 0.82);
      for (let k = 0; k < 4; k++) { const y = -0.55 + k * 0.33, w = s === 1 ? 0.42 : 0.4; g.moveTo(0, y + 0.18); g.lineTo(-w, y - 0.08); g.moveTo(0, y + 0.18); g.lineTo(w, y - 0.08); }
    }
  }

  function makeLeaf(s, col, back, seed) {
    return sprite((g) => {
      const rnd = rng(seed), tip = mix(col, P.yellow, back ? 0.22 : 0.08), base = mix(col, P.brown, back ? 0.18 : 0.3);
      leafPath(g, s);
      const lg = g.createLinearGradient(-0.3, -1, 0.3, 0.9);
      lg.addColorStop(0, back ? mix(tip, P.white, 0.16) : tip); lg.addColorStop(1, back ? mix(base, P.white, 0.12) : base);
      g.fillStyle = lg; g.fill();
      g.save(); g.clip();
      for (let i = 0; i < 5; i++) {
        const x = (rnd() - 0.5) * 1.4, y = (rnd() - 0.5) * 1.6, r = 0.2 + 0.35 * rnd(), k = rnd();
        const acc = k < 0.4 ? mix(col, P.yellow, 0.5) : k < 0.7 ? mix(col, P.brown, 0.5) : k < 0.85 ? mix(col, P.green, 0.3) : mix(col, P.red, 0.4);
        const rg = g.createRadialGradient(x, y, 0, x, y, r);
        rg.addColorStop(0, rgba(acc, back ? 0.2 : 0.36)); rg.addColorStop(1, rgba(acc, 0));
        g.fillStyle = rg; g.fillRect(-1.6, -1.6, 3.2, 3.2);
      }
      const eg = g.createRadialGradient(0, 0.1, 0.4, 0, 0.1, 1.3);
      eg.addColorStop(0, rgba(base, 0)); eg.addColorStop(1, rgba(mix(col, P.brown, 0.55), back ? 0.15 : 0.35));
      g.fillStyle = eg; g.fillRect(-1.6, -1.6, 3.2, 3.2);
      veins(g, s);
      g.strokeStyle = back ? rgba(mix(col, P.white, 0.5), 0.45) : rgba(mix(col, P.brown, 0.55), 0.4); g.lineWidth = 0.04; g.stroke();
      g.restore();
      leafPath(g, s);
      g.strokeStyle = rgba(mix(col, P.brown, 0.6), back ? 0.16 : 0.34); g.lineWidth = 0.045; g.stroke();
      g.beginPath(); g.moveTo(0, s === 3 ? 0.72 : s === 0 ? 0.5 : 0.84); g.quadraticCurveTo(0.02, 1.05, 0.1, 1.24);
      g.strokeStyle = rgba(mix(col, P.brown, 0.7), 0.85); g.lineWidth = 0.065; g.stroke();
    });
  }

  function petalPath(g) {
    g.beginPath(); g.moveTo(0, 0.95);
    g.bezierCurveTo(0.2, 0.74, 0.54, 0.2, 0.52, -0.42); g.bezierCurveTo(0.5, -0.82, 0.28, -0.98, 0.09, -0.95); g.quadraticCurveTo(0.03, -0.93, 0, -0.87);
    g.quadraticCurveTo(-0.03, -0.93, -0.09, -0.95); g.bezierCurveTo(-0.28, -0.98, -0.5, -0.82, -0.52, -0.42); g.bezierCurveTo(-0.54, 0.2, -0.2, 0.74, 0, 0.95);
    g.closePath();
  }

  function makePetal(col, back) {
    return sprite((g) => {
      petalPath(g);
      const rg = g.createRadialGradient(0, 0.95, 0.04, 0, 0.1, 1.3);
      rg.addColorStop(0, mix(col, P.pink, back ? 0.2 : 0.34)); rg.addColorStop(0.45, mix(col, P.white, back ? 0.32 : 0.14)); rg.addColorStop(1, mix(col, P.white, back ? 0.72 : 0.55));
      g.fillStyle = rg; g.fill();
      g.save(); g.clip(); g.beginPath();
      for (let k = -2; k <= 2; k++) { g.moveTo(0, 0.9); g.quadraticCurveTo(k * 0.12, 0.1, k * 0.2, -0.8); }
      g.strokeStyle = rgba(mix(col, P.pink, 0.4), back ? 0.08 : 0.14); g.lineWidth = 0.03; g.stroke();
      g.restore();
      petalPath(g); g.strokeStyle = rgba(mix(col, P.pink, 0.3), 0.12); g.lineWidth = 0.04; g.stroke();
    });
  }

  function makeSeed(seed) {
    return sprite((g) => {
      const rnd = rng(seed), n = 36;
      let rg = g.createRadialGradient(0, 0, 0.2, 0, 0, 1.05);
      rg.addColorStop(0, rgba(P.white, 0.04)); rg.addColorStop(0.68, rgba(P.white, 0.18)); rg.addColorStop(1, rgba(P.white, 0));
      g.fillStyle = rg; g.beginPath(); g.arc(0, 0, 1.05, 0, TAU); g.fill();
      for (let i = 0; i < n; i++) {
        const a = (i / n) * TAU + (rnd() - 0.5) * 0.16, l = 0.7 + 0.2 * rnd(), b = (rnd() - 0.5) * 0.12, ca = Math.cos(a), sa = Math.sin(a);
        g.lineWidth = 0.022; g.strokeStyle = rgba(P.white, 0.34); g.beginPath(); g.moveTo(ca * 0.06, sa * 0.06); g.lineTo(ca * l * 0.6, sa * l * 0.6); g.stroke();
        g.lineWidth = 0.026; g.strokeStyle = rgba(P.white, 0.62); g.beginPath(); g.moveTo(ca * l * 0.6, sa * l * 0.6); g.quadraticCurveTo(Math.cos(a + b) * l * 0.8, Math.sin(a + b) * l * 0.8, ca * l, sa * l);
        for (let k = -2; k <= 2; k++) { const h = a + k * 0.16 + (rnd() - 0.5) * 0.06, m = 0.12 + 0.1 * rnd(); g.moveTo(ca * l, sa * l); g.lineTo(ca * l + Math.cos(h) * m, sa * l + Math.sin(h) * m); }
        g.stroke();
      }
      rg = g.createRadialGradient(0, 0, 0, 0, 0, 0.18);
      rg.addColorStop(0, rgba(mix(P.brown, P.gray, 0.3), 0.95)); rg.addColorStop(0.55, rgba(mix(P.brown, P.white, 0.3), 0.6)); rg.addColorStop(1, rgba(P.white, 0));
      g.fillStyle = rg; g.beginPath(); g.arc(0, 0, 0.18, 0, TAU); g.fill();
    });
  }

  function makeStar(col) {
    const n = 64, R = n / 2, c = cv(n), g = c.getContext("2d");
    g.translate(R, R);
    let rg = g.createRadialGradient(0, 0, 0, 0, 0, R * 0.26);
    rg.addColorStop(0, rgba(P.white, 1)); rg.addColorStop(0.35, rgba(col, 0.5)); rg.addColorStop(1, rgba(col, 0));
    g.fillStyle = rg; g.fillRect(-R, -R, n, n);
    for (const [a, s, al] of [[0, 0.04, 0.95], [Math.PI / 2, 0.04, 0.95], [Math.PI / 4, 0.028, 0.32], [-Math.PI / 4, 0.028, 0.32]]) {
      g.save(); g.rotate(a); g.scale(1, s);
      rg = g.createRadialGradient(0, 0, 0, 0, 0, R);
      rg.addColorStop(0, rgba(P.white, al)); rg.addColorStop(0.25, rgba(col, al * 0.45)); rg.addColorStop(1, rgba(col, 0));
      g.fillStyle = rg; g.beginPath(); g.arc(0, 0, R, 0, TAU); g.fill(); g.restore();
    }
    return c;
  }

  function makeStreak(w, col) {
    const h = 96, c = cv(w, h), g = c.getContext("2d");
    let lg = g.createLinearGradient(0, 0, 0, h);
    lg.addColorStop(0, rgba(col, 0)); lg.addColorStop(0.45, rgba(col, 0.28)); lg.addColorStop(0.86, rgba(col, 0.95)); lg.addColorStop(0.95, rgba(col, 0.75)); lg.addColorStop(1, rgba(col, 0));
    g.fillStyle = lg; g.fillRect(0, 0, w, h);
    if (w < 4) return c;
    g.globalCompositeOperation = "destination-in";
    lg = g.createLinearGradient(0, 0, w, 0);
    lg.addColorStop(0, rgba(P.white, 0)); lg.addColorStop(0.25, rgba(P.white, 0.55)); lg.addColorStop(0.5, rgba(P.white, 1)); lg.addColorStop(0.75, rgba(P.white, 0.55)); lg.addColorStop(1, rgba(P.white, 0));
    g.fillStyle = lg; g.fillRect(0, 0, w, h);
    return c;
  }

  function makeWet() {
    const w = 8, h = 64, c = cv(w, h), g = c.getContext("2d");
    let lg = g.createLinearGradient(0, 0, 0, h);
    lg.addColorStop(0, rgba(P.white, 0)); lg.addColorStop(0.7, rgba(P.white, 0.07)); lg.addColorStop(1, rgba(P.white, 0.18));
    g.fillStyle = lg; g.fillRect(0, 0, w, h);
    g.globalCompositeOperation = "destination-in";
    lg = g.createLinearGradient(0, 0, w, 0);
    lg.addColorStop(0, rgba(P.white, 0)); lg.addColorStop(0.5, rgba(P.white, 1)); lg.addColorStop(1, rgba(P.white, 0));
    g.fillStyle = lg; g.fillRect(0, 0, w, h);
    return c;
  }

  function makeLens() {
    const R = 64, c = cv(R * 2), g = c.getContext("2d");
    g.save(); g.beginPath(); g.arc(R, R, R * 0.99, 0, TAU); g.clip();
    let lg = g.createLinearGradient(R * 0.4, R * 0.1, R * 1.5, R * 1.9);
    lg.addColorStop(0, rgba(P.black, 0.2)); lg.addColorStop(0.5, rgba(P.black, 0.05)); lg.addColorStop(1, rgba(P.black, 0));
    g.fillStyle = lg; g.fillRect(0, 0, R * 2, R * 2);
    let rg = g.createRadialGradient(R * 1.12, R * 1.22, R * 0.62, R, R, R);
    rg.addColorStop(0, rgba(P.black, 0)); rg.addColorStop(0.8, rgba(P.black, 0.06)); rg.addColorStop(0.96, rgba(P.black, 0.3)); rg.addColorStop(1, rgba(P.black, 0.12));
    g.fillStyle = rg; g.fillRect(0, 0, R * 2, R * 2);
    rg = g.createRadialGradient(R * 0.86, R * 0.78, R * 0.7, R * 0.92, R * 0.86, R * 1.18);
    rg.addColorStop(0, rgba(P.white, 0)); rg.addColorStop(0.55, rgba(P.white, 0.3)); rg.addColorStop(0.8, rgba(P.white, 0.12)); rg.addColorStop(1, rgba(P.white, 0));
    g.fillStyle = rg; g.fillRect(0, 0, R * 2, R * 2);
    g.restore();
    g.save(); g.translate(R * 0.66, R * 0.6); g.rotate(-0.8); g.scale(1, 0.5);
    rg = g.createRadialGradient(0, 0, 0, 0, 0, R * 0.2);
    rg.addColorStop(0, rgba(P.white, 0.9)); rg.addColorStop(0.35, rgba(P.white, 0.45)); rg.addColorStop(1, rgba(P.white, 0));
    g.fillStyle = rg; g.beginPath(); g.arc(0, 0, R * 0.2, 0, TAU); g.fill(); g.restore();
    rg = g.createRadialGradient(R * 1.32, R * 1.3, 0, R * 1.32, R * 1.3, R * 0.07);
    rg.addColorStop(0, rgba(P.white, 0.4)); rg.addColorStop(1, rgba(P.white, 0));
    g.fillStyle = rg; g.fillRect(0, 0, R * 2, R * 2);
    return c;
  }

  function makeSprites() {
    const crimson = mix(mix(P.red, P.black, 0.24), P.orange, 0.1), scarlet = mix(mix(P.red, P.orange, 0.3), P.black, 0.1), flame = mix(mix(P.orange, P.red, 0.3), P.black, 0.04), amber = mix(P.orange, P.yellow, 0.4), gold = mix(P.yellow, P.orange, 0.22), russet = mix(mix(P.brown, P.red, 0.3), P.black, 0.2), wine = mix(mix(P.red, P.purple, 0.18), P.black, 0.38);
    const leaf = (s, col, i) => { const a = makeLeaf(s, col, 0, 100 + i), b = makeLeaf(s, col, 1, 100 + i), f = blur(a, 1.8, 2); return { a, b, fa: f, fb: f, m: s === 0 }; };
    const petal = (col) => { const a = makePetal(col, 0), b = makePetal(col, 1); return { a, b, fa: blur(a, 2, 2), fb: blur(b, 2, 2) }; };
    const seed = (i) => { const a = blur(makeSeed(200 + i), 0.85, 1), f = blur(a, 1.8, 2); return { a, b: a, fa: f, fb: f }; };
    SP = {
      streak: makeStreak(2, P.white), soft: makeStreak(8, P.white), streakD: makeStreak(2, DARK), softD: makeStreak(8, DARK), wet: makeWet(), lens: makeLens(), stars: [P.white, mix(P.white, P.yellow, 0.35), mix(P.white, P.cyan, 0.4), mix(P.white, P.pink, 0.3)].map(makeStar),
      dot: cv(32), lit: cv(32), bok: cv(64), bokL: cv(64), fh: cv(32), fs: cv(48), fb: cv(64),
      ffg: disc(cv(64), GAUSS, mix(P.yellow, P.green, 0.32)), ffc: disc(cv(32), HARD, mix(P.yellow, P.white, 0.55)),
      glow: disc(cv(128), [0, 1, 0.2, 0.6, 0.45, 0.25, 0.7, 0.07, 1, 0], mix(P.white, P.indigo, 0.22)),
      autumn: [[0, crimson], [0, scarlet], [0, flame], [0, amber], [0, wine], [1, amber], [1, gold], [1, flame], [2, russet], [2, scarlet], [3, gold]].map(([s, col], i) => leaf(s, col, i)),
      spring: [mix(P.pink, P.white, 0.8), mix(P.pink, P.white, 0.68), mix(P.pink, P.white, 0.56)].map(petal),
      summer: [seed(0), seed(1)],
    };
  }

  function retint(T) {
    const k = T.key + T.season;
    if (k === tintKey) return;
    tintKey = k;
    const w = T.season === "winter", su = T.season === "summer" || T.season === "spring";
    const day = !!T.sun, base = !day ? mix(mix(T.light, P.white, 0.4), P.cyan, 0.08) : w ? mix(P.white, P.cyan, 0.14) : mix(mix(T.light, P.white, 0.35), P.yellow, su ? 0.22 : 0.1);
    const lit = !day ? mix(P.white, T.light, 0.25) : w ? mix(P.white, T.warm || T.light, 0.35) : mix(mix(T.warm || T.light, P.yellow, 0.42), P.orange, 0.06), snow = mix(T.light, P.white, 0.55);
    disc(SP.dot, GAUSS, base); disc(SP.lit, GAUSS, lit); disc(SP.bok, BOKEH, base); disc(SP.bokL, BOKEH, lit);
    disc(SP.fh, FLAKE, snow); disc(SP.fs, GAUSS, snow); disc(SP.fb, BOKEH, snow);
    ribCol = mix(T.light, P.white, 0.6); ribHalo = mix(T.light, T.mid, 0.2);
    boltCol = mix(P.white, P.indigo, 0.12); liftCol = mix(P.white, P.indigo, 0.3); veilCol = mix(T.mid, P.gray, 0.4);
    const c = Core.parse(T.mid);
    rainLk = 0.5 * smooth(((c[0] * 0.299 + c[1] * 0.587 + c[2] * 0.114) / 255 - 0.42) / 0.25);
  }

  /* FIELDS */

  function entry(p, m) {
    const W = G.W, H = G.H, x = G.rnd() * W, y = G.rnd() * H, ux = A.ux, uy = A.uy;
    const tx = ux > 0.01 ? (x + m) / ux : ux < -0.01 ? (W + m - x) / -ux : 1e9, ty = uy > 0.01 ? (y + m) / uy : uy < -0.01 ? (H + m - y) / -uy : 1e9, d = Math.min(tx, ty);
    p.x = x - ux * d; p.y = y - uy * d;
  }

  function resetRain(p, spread) {
    const r = G.rnd();
    p.d = r < 0.08 ? 2 : r < 0.36 ? 1 : 0;
    p.a = G.rnd() * TAU;
    p.r = 0.03 + (p.d ? Math.sqrt(G.rnd()) : Math.pow(G.rnd(), 0.8)) * 0.95;
    p.sp = 0.75 + 0.5 * G.rnd();
    p.life = (p.d === 2 ? 0.35 : 0.5) + 0.6 * G.rnd();
    p.age = spread ? G.rnd() * p.life : 0;
    p.k = 0.6 + 0.4 * G.rnd(); p.w = 0.8 + 0.4 * G.rnd(); p.ox = 0; p.oy = 0;
  }

  function resetSnow(p, spread) {
    p.x = G.rnd() * G.W; p.y = G.rnd() * G.H;
    p.z = spread ? G.rnd() * 0.95 : G.rnd() * 0.06;
    p.zs = 0.022 + G.rnd() * 0.04;
    p.w = 0.5 + G.rnd() * 1.1; p.ph = G.rnd() * TAU; p.g = 0.65 + 0.35 * G.rnd(); p.f = spread ? 1 : 0;
  }

  function resetCarry(p, spread, kind) {
    const S = G.S, list = SP && SP[kind];
    p.kind = kind; p.z = Math.pow(G.rnd(), 1.25); p.zs = 0.004 + 0.01 * G.rnd(); p.zc = p.z < 0.86 ? 0.84 : 1;
    p.s = list ? list[Math.floor(G.rnd() * list.length)] : null;
    if (p.s && p.s.m && p.z < 0.45) p.s = list[list.length - 1 - Math.floor(G.rnd() * 6)];
    if (spread) { p.x = G.rnd() * G.W; p.y = G.rnd() * G.H; } else entry(p, S * 0.08);
    flow(p.x, p.y);
    const k = S * (0.03 + 0.085 * p.z);
    p.vx = fl.x * k; p.vy = fl.y * k;
    const ks = KIND[kind], fl0 = ks && !ks.flip;
    p.ra = G.rnd() * TAU; p.tb = fl0 ? (G.rnd() - 0.5) * 0.6 : G.rnd() * TAU; p.rc0 = (G.rnd() - 0.5) * (fl0 ? 0.5 : 1.2); p.rb = 0; p.rc = 0;
    p.wa = (G.rnd() - 0.5) * 2; p.wb = (G.rnd() < 0.5 ? -1 : 1) * (0.5 + G.rnd());
    p.ph = G.rnd() * TAU; p.ff = 0.6 + 0.8 * G.rnd();
    p.vis = 1;
  }

  function resetMote(p, spread) {
    const wi = G.T && G.T.season === "winter";
    if (G.rnd() < (wi ? 0.7 : 0.55)) { const a = G.rnd() * TAU, d = (wi ? 0.15 + 0.85 * Math.sqrt(G.rnd()) : Math.sqrt(G.rnd())) * G.S * (wi ? 0.8 : 0.55); p.x = clamp(sun.x + Math.cos(a) * d, 0, G.W); p.y = clamp(sun.y + Math.sin(a) * d, 0, G.H); }
    else { p.x = G.rnd() * G.W; p.y = G.rnd() * G.H; }
    p.z = Math.pow(G.rnd(), 1.7);
    p.ph = G.rnd() * TAU; p.gs = 0.5 + 2.2 * G.rnd(); p.w = 0.3 + G.rnd(); p.k = G.rnd();
    p.life = 8 + 14 * G.rnd(); p.age = spread ? G.rnd() * p.life : 0; p.vis = spread ? 1 : 0;
  }

  function seedFields() {
    const sp = Mood.sunAt();
    sun.x = sp[0]; sun.y = sp[1];
    rainP.length = snowP.length = carry.length = motes.length = 0;
    const kind = G.T ? look().season : "summer";
    for (let i = 0; i < MAXRAIN; i++) { const p = {}; resetRain(p, true); rainP.push(p); }
    for (let i = 0; i < MAXSNOW; i++) { const p = {}; resetSnow(p, true); snowP.push(p); }
    for (let i = 0; i < MAXCARRY; i++) { const p = {}; resetCarry(p, true, kind); carry.push(p); }
    for (let i = 0; i < MAXMOTE; i++) { const p = {}; resetMote(p, true); motes.push(p); }
    lens.length = beads.length = 0;
    for (const r of ribs) r.on = 0;
  }

  function build(resized) {
    if (!SP) {
      makeSprites();
      for (let i = 0; i < MAXRIB; i++) ribs.push({ on: 0, px: new Float32Array(NP), py: new Float32Array(NP), n: 0, np: NP, f: 0 });
    }
    if (resized || !rainP.length) seedFields();
    tintKey = "";
  }

  /* LOOK */

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

  function carryCount(T) {
    const s = T.season, st = clamp(T.storm, 0, 1), dry = (1 - 0.6 * clamp(T.rain, 0, 1)) * (s === "autumn" ? 1 - 0.3 * st : 1 - st) * (T.sun ? 1 : 0.45) * (1 + 0.7 * clamp(A.g, 0, 1));
    if (s === "autumn") return Math.round((4 + 22 * T.leaves + 4 * T.dust) * dry);
    if (s === "spring") return Math.round((6 + 14 * T.leaves + 22 * T.dust) * dry);
    if (s === "summer") return T.sun ? Math.round((2 + 6 * T.leaves + 8 * T.dust) * dry) : 0;
    return 0;
  }

  function moteCount(T) {
    const s = T.season, dry = (1 - 0.9 * clamp(T.rain, 0, 1)) * (1 - clamp(T.snow * 3, 0, 1)) * (1 - 0.4 * clamp(T.fog, 0, 1));
    const base = s === "winter" ? 0.82 : s === "summer" ? 0.42 : s === "spring" ? 0.36 : 0.3;
    return Math.round(MAXMOTE * clamp(base + 0.6 * T.dust, 0, 1) * dry * (T.sun ? 1 : 0.7));
  }

  /* STEP */

  function front(u) { return u > 0 ? Math.exp(-u * u * 4) : Math.exp(-u * u * 0.45); }

  function air() {
    const T = look(), t = G.t, S = G.S || 1, wk = T.windK > 0 ? T.windK : 1, st = clamp(T.storm || 0, 0, 1);
    const dt = A.t < 0 ? 0 : clamp(t - A.t, 0, 0.1);
    A.t = t;
    const ang = 0.3 * noise(t * 0.021, 4) + 0.07 * noise(t * 0.083, 5);
    A.ux = Math.cos(ang); A.uy = Math.sin(ang); A.wk = wk;
    A.base = wk * (0.84 + 0.24 * noise(t * 0.034, 3) + 0.08 * noise(t * 0.13, 6));
    const R = Math.hypot(G.W, G.H) * 0.5;
    A.next -= dt;
    if (A.next <= 0) {
      if (gusts.length < 3) {
        const w = S * (0.22 + 0.26 * G.rnd());
        gusts.push({ d: -R - w * 1.5, v: S * (0.16 + 0.12 * G.rnd()) * (0.8 + 0.2 * wk), w, a: 0.22 + 0.38 * G.rnd(), ph: G.rnd() * TAU, kq: (2 + 3 * G.rnd()) / S });
      }
      A.next = (12 + 22 * G.rnd()) / (0.6 + 0.4 * wk + 0.8 * st);
    }
    let gc = 0;
    for (let i = gusts.length - 1; i >= 0; i--) {
      const q = gusts[i];
      q.d += q.v * dt;
      if (q.d > R + q.w * 4) { gusts.splice(i, 1); continue; }
      gc += q.a * front(-q.d / (q.w + R * 0.5));
    }
    A.g = gc;
    A.m = clamp(A.base + wk * gc, 0.4 * wk, 1.65 * wk);
    const va = ang + 0.12 * gc;
    G.wind.x = Math.cos(va) * A.m; G.wind.y = Math.sin(va) * A.m;
    A.ox += G.wind.x * S * 0.03 * dt; A.oy += G.wind.y * S * 0.03 * dt;
  }

  function gustAt(x, y) {
    const cx = x - G.W * 0.5, cy = y - G.H * 0.5, s = cx * A.ux + cy * A.uy, n = cy * A.ux - cx * A.uy;
    let g = 0;
    for (let i = 0; i < gusts.length; i++) { const q = gusts[i]; g += q.a * front((s - q.d) / q.w) * (0.6 + 0.4 * Math.sin(n * q.kq + q.ph)); }
    return g;
  }

  function flow(x, y) {
    const g = gustAt(x, y), k = 1 / (0.22 * (G.S || 1)), px = (x - A.ox) * k, py = (y - A.oy) * k, t = G.t;
    const c1 = Math.cos(0.9 * px + 0.5 * py + 0.13 * t), c2 = Math.cos(-0.4 * px + 1.1 * py - 0.17 * t + 1.7);
    const c3 = Math.cos(1.7 * px - 1.2 * py + 0.23 * t + 4.1), c4 = Math.cos(-1.3 * px - 1.9 * py - 0.29 * t + 2.6);
    const tx = 0.25 * c1 + 0.44 * c2 - 0.24 * c3 - 0.25 * c4, ty = -0.45 * c1 + 0.16 * c2 - 0.34 * c3 + 0.17 * c4;
    const m = A.base + A.wk * g, tb = A.wk * (0.32 + 0.4 * g);
    fl.x = A.ux * m + tx * tb; fl.y = A.uy * m + ty * tb; fl.g = g;
    return fl;
  }

  function stepRain(dt, T) {
    rainN = Math.round(clamp(T.rain, 0, 1) * MAXRAIN * dn);
    const k = G.S * 0.2 * dt / (1 + 0.25 * Math.hypot(G.wind.x, G.wind.y)), wx = G.wind.x * k, wy = G.wind.y * k;
    for (let i = 0; i < rainN; i++) {
      const p = rainP[i];
      p.r += dt * p.sp * DV[p.d] * (0.16 + p.r);
      p.ox += wx * DV[p.d]; p.oy += wy * DV[p.d];
      p.age += dt;
      if (p.age > p.life || p.r > 1.15) resetRain(p, false);
    }
  }

  function stepSnow(dt, T) {
    const S = G.S, W = G.W, H = G.H, fx = W * 0.5 - G.wind.x * S * 0.05, fy = H * 0.48 - G.wind.y * S * 0.05;
    snowN = Math.round(clamp(T.snow, 0, 1) * MAXSNOW * (0.3 + 0.7 * dn));
    for (let i = 0; i < snowN; i++) {
      const p = snowP[i];
      p.z += dt * p.zs * (0.7 + 0.9 * p.z);
      flow(p.x, p.y);
      const k = S * (0.01 + 0.05 * p.z), e = 0.015 + 0.16 * p.z * p.z;
      p.x += (fl.x * k + (p.x - fx) * e) * dt; p.y += (fl.y * k + (p.y - fy) * e + S * 0.004) * dt;
      p.f = Math.min(1, p.f + dt * 0.8);
      const m = S * 0.08;
      if (p.z > 1 || p.x < -m || p.x > W + m || p.y < -m || p.y > H + m) resetSnow(p, false);
    }
  }

  function stepCarry(dt, T) {
    const S = G.S, W = G.W, H = G.H, t = G.t, m = S * 0.12;
    carryN = KIND[T.season] ? Math.min(MAXCARRY, Math.round(carryCount(T) * (0.4 + 0.6 * dn))) : 0;
    for (let i = 0; i < MAXCARRY; i++) {
      const p = carry[i], want = i < carryN && p.kind === T.season;
      if (!want && p.vis <= 0) { if (i < carryN) resetCarry(p, false, T.season); else continue; }
      const ks = KIND[p.kind];
      if (!ks || !p.s) { p.vis = 0; continue; }
      p.vis = clamp(p.vis + (want ? dt / 1.5 : -dt / 2), 0, 1);
      flow(p.x, p.y);
      const k = S * (0.03 + 0.085 * p.z) * ks.drift, q = Math.min(1, dt * ks.resp);
      p.vx += (fl.x * k - p.vx) * q; p.vy += (fl.y * k - p.vy) * q;
      const v = Math.hypot(p.vx, p.vy) || 1, ph = t * p.ff * ks.ff + p.ph, sw = Math.sin(ph) * S * ks.sway * (0.4 + 0.6 * p.z);
      p.x += (p.vx - p.vy / v * sw) * dt; p.y += (p.vy + p.vx / v * sw) * dt;
      p.ra += p.wa * ks.spin * (0.3 + 1.4 * fl.g) * dt * 0.5;
      p.tb += p.wb * ks.flip * (0.15 + 2.5 * fl.g) * dt;
      p.rb = p.tb + Math.cos(ph) * ks.rock;
      p.rc = p.rc0 + Math.sin(ph * 0.5 + 1) * 0.5 * ks.rock;
      p.z = Math.min(p.zc, p.z + p.zs * dt);
      if (p.x < -m || p.x > W + m || p.y < -m || p.y > H + m) { if (want) resetCarry(p, false, T.season); else p.vis = 0; }
    }
  }

  function flies(T) { return T.season === "summer" && (!T.sun || T.dark > 0.62) && T.rain < 0.1 && T.fog < 0.5 ? 1 : 0; }

  function stepMotes(dt, T) {
    const S = G.S, W = G.W, H = G.H, t = G.t, ff = flies(T);
    ffK = clamp(ffK + (ff ? dt : -dt) / 3, 0, 1);
    moteN = Math.min(MAXMOTE, Math.round(moteCount(T) * (0.3 + 0.7 * dn)));
    if (ffK > 0.5) moteN = Math.min(moteN, 20);
    for (let i = 0; i < MAXMOTE; i++) {
      const p = motes[i], want = i < moteN;
      if (!want && p.vis <= 0) continue;
      p.vis = clamp(p.vis + (want ? dt / 2 : -dt / 2), 0, 1);
      flow(p.x, p.y);
      const k = S * (0.012 + 0.05 * p.z) * (1 - 0.8 * ffK), j = S * 0.004 * (0.5 + p.z), h = TAU * noise(t * 0.13 + p.k * 97, 7) + p.ph, v = S * 0.022 * ffK * (0.5 + p.z);
      p.x += (fl.x * k + Math.cos(t * p.w + p.ph) * j + Math.cos(h) * v) * dt; p.y += (fl.y * k + Math.sin(t * p.w * 1.3 + p.ph) * j + Math.sin(h) * v) * dt;
      const m = S * (p.z > 0.8 ? 0.06 : 0.02);
      if (p.x < -m) p.x += W + m * 2; else if (p.x > W + m) p.x -= W + m * 2;
      if (p.y < -m) p.y += H + m * 2; else if (p.y > H + m) p.y -= H + m * 2;
      p.age += dt;
      if (p.age > p.life) { resetMote(p, false); p.vis = want ? 1 : 0; }
    }
  }

  function spawnRib() {
    let r = null;
    for (const q of ribs) if (!q.on) { r = q; break; }
    if (!r) return;
    const S = G.S, W = G.W, H = G.H, R = Math.hypot(W, H) * 0.5;
    let x = G.rnd() * W, y = G.rnd() * H;
    for (const q of gusts) if (Math.abs(q.d) < R * 0.9) {
      const s = q.d - q.w * (0.2 + 0.6 * G.rnd()), n = (G.rnd() - 0.5) * 1.4 * R;
      x = clamp(W * 0.5 + A.ux * s - A.uy * n, -W * 0.05, W * 1.05); y = clamp(H * 0.5 + A.uy * s + A.ux * n, -H * 0.05, H * 1.05);
      break;
    }
    r.on = 1; r.x = x; r.y = y; r.age = 0; r.life = 4 + 3.5 * G.rnd(); r.f = 0;
    r.np = 30 + Math.floor(G.rnd() * 40); r.step = S * (0.0075 + 0.004 * G.rnd()); r.w = (0.8 + 0.9 * G.rnd()) * clamp(S / 760, 0.7, 1.5);
    r.sp = 0.13 + 0.09 * G.rnd(); r.k = 0.6 + 0.4 * G.rnd(); r.ph = G.rnd() * TAU; r.wa = 0.45 + 0.35 * G.rnd(); r.wf = 0.7 + 0.5 * G.rnd(); r.tw = G.rnd() * TAU; r.tk = 2 + 4 * G.rnd();
    flow(x, y); r.hd = Math.atan2(fl.y, fl.x);
    r.ct = G.rnd() < 0.6 ? 0.8 + G.rnd() * (r.life - 2.8) : -1; r.cd = G.rnd() < 0.5 ? -1 : 1; r.cA = TAU * (0.9 + 0.8 * G.rnd()); r.ca = 0; r.cr = S * (0.03 + 0.03 * G.rnd());
    r.px[0] = x; r.py[0] = y; r.n = 1;
  }

  function stepRibs(dt, T) {
    const S = G.S, t = G.t, b = clamp((A.m - 0.75) / 0.9, 0, 1), st = clamp(T.storm || 0, 0, 1);
    const season = T.season === "autumn" ? 1.5 : T.season === "winter" ? 1.15 : T.season === "summer" ? 0.85 : 1;
    let front = 0;
    const R = Math.hypot(G.W, G.H) * 0.5;
    for (const q of gusts) if (Math.abs(q.d) < R) front = Math.max(front, q.a);
    const rate = (0.012 + 0.3 * b * b + 0.35 * front) * season * (1 + 0.5 * st) * (1 - 0.6 * clamp(T.fog, 0, 1)) * (1 - 0.5 * clamp(T.rain, 0, 1) * (1 - st)) * (1 - 0.5 * clamp(T.snow, 0, 1));
    let live = 0;
    for (const r of ribs) live += r.on;
    if (live < (st > 0.5 ? 3 : MAXRIB) && G.rnd() < dt * rate) spawnRib();
    for (const r of ribs) {
      if (!r.on) continue;
      r.age += dt;
      if (r.age > r.life) { r.on = 0; continue; }
      flow(r.x, r.y);
      let sp = S * r.sp * Math.hypot(fl.x, fl.y);
      const curl = r.ct >= 0 && r.age > r.ct && r.ca < r.cA;
      if (curl) {
        const u = r.ca / r.cA, rad = r.cr * (1 - 0.55 * u);
        sp *= 1 - 0.35 * u;
        const w = sp / rad;
        r.hd += r.cd * w * dt; r.ca += w * dt;
      } else {
        const fh = Math.atan2(fl.y, fl.x);
        let d = fh + r.wa * Math.sin(r.age * r.wf + r.ph) - r.hd;
        d = Math.atan2(Math.sin(d), Math.cos(d));
        r.hd += d * Math.min(1, dt * (r.ca > 0 ? 2.6 : 2));
      }
      r.x += Math.cos(r.hd) * sp * dt; r.y += Math.sin(r.hd) * sp * dt;
      const dd = Math.hypot(r.x - r.px[r.n - 1], r.y - r.py[r.n - 1]), stp = r.step * (curl ? 0.45 : 1);
      if (dd >= stp) {
        if (r.n >= r.np) { r.px.copyWithin(0, 1, r.n); r.py.copyWithin(0, 1, r.n); r.n--; }
        r.px[r.n] = r.x; r.py[r.n] = r.y; r.n++; r.f = 0;
      } else r.f = dd / stp;
      r.tw += dt * 1.3;
    }
  }

  function stepLens(dt, T) {
    const S = Math.max(G.S, 480), H = G.H;
    wet = Math.max(T.rain, wet - dt * 0.03);
    const cap = Math.round(MAXLENS * clamp(0.3 + 0.5 * T.rain + 0.3 * T.storm, 0, 1)), rate = 0.35 * T.rain + 0.4 * T.storm + 0.06 * wet;
    if (wet > 0.01 && lens.length < cap && G.rnd() < dt * rate) {
      const k = G.rnd(), r = S * (0.008 + 0.015 * k * k);
      lens.push({ x: G.rnd() * G.W, y: G.rnd() * H * 0.85, r, k, ax: 0.9 + 0.2 * G.rnd(), age: 0, life: 12 + G.rnd() * 18, a: 0, run: 0, vy: 0, ty: 0, wait: r > S * 0.014 && G.rnd() < 0.55 ? 3 + G.rnd() * 9 : 1e9, bt: 0, bn: 2, sq: 0 });
    }
    for (let i = lens.length - 1; i >= 0; i--) {
      const p = lens[i];
      p.age += dt;
      p.a = Math.min(1, p.age / 0.25) * (1 - smooth((p.age - p.life) / 3));
      if (!p.run) { p.wait -= dt; if (p.wait <= 0) { p.run = 1; p.ty = p.y; } }
      else {
        p.vy = Math.min(S * (0.04 + 0.07 * p.k), p.vy + dt * S * 0.1);
        if (G.rnd() < dt * 0.8) p.vy *= 0.12;
        p.y += p.vy * dt; p.x += Math.sin(p.age * 1.7 + p.k * 9) * p.r * 0.25 * dt;
        p.ty = Math.max(p.ty + (p.y - p.ty) * dt * 0.2, p.y - S * 0.1);
        p.bt += p.vy * dt;
        if (p.bt > p.r * p.bn) {
          p.bt = 0; p.bn = 1.2 + 3.5 * G.rnd();
          if (beads.length < MAXBEAD && G.rnd() < 0.7) { beads.push({ x: p.x + (G.rnd() - 0.5) * p.r * 0.8, y: p.y - p.r * (1 + 0.4 * G.rnd()), r: p.r * (0.07 + 0.2 * G.rnd() * G.rnd()), age: 0, life: 5 + G.rnd() * 8 }); p.r *= 0.99; }
        }
        p.sq += (Math.min(1, p.vy / (S * 0.05)) - p.sq) * Math.min(1, dt * 4);
      }
      if ((p.a <= 0.001 && p.age > 1) || p.y > H + p.r * 3) lens.splice(i, 1);
    }
    for (let i = beads.length - 1; i >= 0; i--) { const b = beads[i]; b.age += dt; if (b.age > b.life) beads.splice(i, 1); }
  }

  function cloudAt() {
    const list = typeof Clouds !== "undefined" && Clouds.clouds ? Clouds.clouds() : null, W = G.W, H = G.H;
    if (list && list.length) {
      for (let tries = 0; tries < 6; tries++) {
        const c = list[Math.floor(G.rnd() * list.length)];
        if (!c || !(c.layer >= 2) || !(c.w > 0)) continue;
        const x = c.x + c.w * (0.25 + 0.5 * G.rnd()), y = c.y + c.w * (0.18 + 0.2 * G.rnd());
        if (x > W * 0.05 && x < W * 0.95 && y > H * 0.05 && y < H * 0.95) { flash.x = x; flash.y = y; return; }
      }
    }
    flash.x = W * (0.12 + 0.76 * G.rnd()); flash.y = H * (0.1 + 0.6 * G.rnd());
  }

  function branch(x, y, a, len, l, s) {
    const S = G.S, step = S * (l ? 0.008 : 0.01), bx = [x], by = [y];
    let h = a, d = 0, walk = 0;
    while (d < len && bx.length < 120) {
      const seg = step * (0.4 + 1.2 * G.rnd());
      walk = walk * 0.55 + (G.rnd() - 0.5) * 0.9 + (G.rnd() < 0.1 ? (G.rnd() - 0.5) * 1.8 : 0);
      h = a + clamp(walk, -1.1, 1.1);
      x += Math.cos(h) * seg; y += Math.sin(h) * seg; d += seg;
      bx.push(x); by.push(y);
    }
    const n = bx.length;
    bolt.push({ x: bx, y: by, n, l, s });
    if (l >= 2) return;
    let side = G.rnd() < 0.5 ? -1 : 1;
    for (let i = 2; i < n - 2; i++) {
      if (G.rnd() > (l ? 0.1 : 0.13)) continue;
      side = G.rnd() < 0.8 ? -side : side;
      const ba = Math.atan2(by[i + 1] - by[i - 1], bx[i + 1] - bx[i - 1]) + side * (0.3 + 0.5 * G.rnd()), bl = len * (1 - i / n) * (0.3 + 0.4 * G.rnd()) * (l ? 0.6 : 1);
      if (bl > S * 0.03) branch(bx[i], by[i], ba, bl, l + 1, s + (1 - s) * (i / n));
    }
  }

  function strike(force) {
    const T = G.T || {}, S = G.S;
    flash.on = 1; flash.k = 0; flash.next = 5 + G.rnd() * 13;
    flash.amp = 0.55 + 0.45 * clamp(T.storm || 1, 0, 1);
    flash.r = S * (0.35 + 0.35 * G.rnd());
    flash.n = 2 + Math.floor(G.rnd() * 3);
    let at = 0;
    for (let i = 0; i < flash.n; i++) { flash.pk[i] = at; flash.pa[i] = i ? 0.35 + 0.55 * G.rnd() : 1; flash.pw[i] = 0.05 + 0.08 * G.rnd(); at += 0.07 + 0.18 * G.rnd(); }
    flash.dur = at + 0.9;
    cloudAt();
    bolt.length = 0;
    flash.bd = 0;
    if (G.rnd() < 0.3 || force) {
      const a = G.rnd() * TAU, len = S * (0.35 + 0.4 * G.rnd());
      branch(flash.x - Math.cos(a) * len * 0.45, flash.y - Math.sin(a) * len * 0.45, a, len, 0, 0);
      flash.bd = Math.min(flash.dur, flash.pk[flash.n - 1] + 0.35 + 0.25 * G.rnd());
    }
  }

  function env() {
    if (!flash.on) return 0;
    const k = flash.k;
    let e = 0.16 * Math.exp(-k * 2.4) * smooth(k / 0.05);
    for (let i = 0; i < flash.n; i++) { const d = k - flash.pk[i]; e += flash.pa[i] * (d < 0 ? Math.exp(-(d / 0.022) * (d / 0.022)) : Math.exp(-d / flash.pw[i])); }
    return clamp(e, 0, 1) * flash.amp;
  }

  function stepStorm(dt, T) {
    if (T.storm > 0.01) {
      if (!flash.armed) { flash.armed = 1; flash.next = 2 + G.rnd() * 5; }
      if (!flash.on) { flash.next -= dt * (0.5 + T.storm); if (flash.next <= 0) strike(0); }
    } else flash.armed = 0;
    if (flash.on) { flash.k += dt; if (flash.k > flash.dur) flash.on = 0; }
    const F = G.flash;
    F.e = env(); F.x = flash.x; F.y = flash.y; F.r = flash.r;
  }

  function step(dt) {
    const T = look();
    if (!SP) return;
    const s = Mood.sunAt(), il = 1 - Math.abs(2 * clamp(T.moon === undefined ? 0.5 : T.moon, 0, 1) - 1);
    sun.x = s[0]; sun.y = s[1]; dn = clamp(Math.sqrt(G.W * G.H) / 1100, 0.5, 1);
    sun.k = T.sun ? (1 - 0.85 * clamp(T.storm, 0, 1)) * (1 - 0.5 * clamp(T.fog, 0, 1)) * (1 - 0.5 * clamp(T.rain, 0, 1)) : 0.25 + 0.4 * il;
    sun.dk = T.sun ? 1 - 0.45 * clamp(T.dark, 0, 1) : 0.3 + 0.3 * il;
    retint(T);
    stepRain(dt, T);
    stepSnow(dt, T);
    stepCarry(dt, T);
    stepMotes(dt, T);
    stepRibs(dt, T);
    stepStorm(dt, T);
    stepLens(dt, T);
  }

  /* PAINT */

  function put(ctx, a, b, c, d, e, f) { ctx.setTransform(M.a * a + M.c * b, M.b * a + M.d * b, M.a * c + M.c * d, M.b * c + M.d * d, M.a * e + M.c * f + M.e, M.b * e + M.d * f + M.f); }

  function drawRain(ctx, T) {
    const { W, H, S, t } = G, R = Math.hypot(W, H) * 0.52, wx = G.wind.x, wy = G.wind.y;
    const fx = W * 0.5 - wx * S * 0.16 + S * 0.03 * noise(t * 0.05, 21), fy = H * 0.48 - wy * S * 0.16 + S * 0.03 * noise(t * 0.05, 22), vw = S * 0.2 / (1 + 0.25 * Math.hypot(wx, wy));
    const base = (1.05 - 0.35 * T.rain) * (0.45 + 0.55 * sun.dk) * (1 + 1.6 * G.flash.e), R2 = 1 / ((S * 0.4) * (S * 0.4)), sk = T.sun ? sun.k : 0;
    let nf = 0;
    for (let i = 0; i < rainN; i++) {
      const p = rainP[i], c = Math.cos(p.a), s = Math.sin(p.a), r = p.r * R, d = p.d;
      const vr = p.sp * DV[d] * (0.16 + p.r) * R, vx = c * vr + wx * vw * DV[d], vy = s * vr + wy * vw * DV[d], v = Math.hypot(vx, vy) || 1, ux = vx / v, uy = vy / v;
      const L = Math.min(v * DX[d], S * 0.14) + DW[d] * 2;
      const u = p.age / p.life, e = smooth(u / 0.15) * (1 - smooth((u - 0.7) / 0.3));
      const x = fx + c * r + p.ox, y = fy + s * r + p.oy;
      const band = (0.78 + 0.22 * Math.sin(3 * p.a + t * 0.13 + 1.3 * Math.sin(2 * p.a - t * 0.05))) * (0.85 + 0.5 * gustAt(x, y));
      const dx = x - sun.x, dy = y - sun.y, gk = sk * Math.exp(-(dx * dx + dy * dy) * R2), a = Math.min(0.8, DA[d] * p.k * e * band * base * (1 + 1.4 * gk));
      if (a < 0.006) continue;
      const dark = gk < 0.25 && G.flash.e < 0.15 && (p.k - 0.6) / 0.4 < rainLk ? 1 : 0;
      if (!d) { const j = nf * 6; RQ[j] = x - ux * L; RQ[j + 1] = y - uy * L; RQ[j + 2] = x; RQ[j + 3] = y; RQ[j + 4] = dark ? a * 0.75 : a; RQ[j + 5] = dark; nf++; continue; }
      const w = DW[d] * p.w;
      ctx.globalAlpha = dark ? a * 0.75 : a;
      put(ctx, -uy * w, ux * w, ux * L, uy * L, x, y);
      ctx.drawImage(d === 2 ? (dark ? SP.softD : SP.soft) : dark ? SP.streakD : SP.streak, -0.5, -1, 1, 1);
    }
    ctx.setTransform(M.a, M.b, M.c, M.d, M.e, M.f);
    if (!nf) return;
    ctx.lineCap = "round"; ctx.lineWidth = DW[0];
    for (let k = 0; k < 2; k++) {
      ctx.strokeStyle = k ? DARK : P.white;
      for (let b = 0; b < 6; b++) {
        ctx.beginPath();
        let any = 0;
        for (let i = 0; i < nf; i++) {
          const j = i * 6;
          if (RQ[j + 5] !== k || Math.min(5, Math.floor(RQ[j + 4] / 0.11)) !== b) continue;
          ctx.moveTo(RQ[j], RQ[j + 1]); ctx.lineTo(RQ[j + 2], RQ[j + 3]); any = 1;
        }
        if (any) { ctx.globalAlpha = (b + 0.6) * 0.11; ctx.stroke(); }
      }
    }
    ctx.lineCap = "butt";
  }

  function ribSide(ctx, n, ko, kw, sg) {
    const i0 = sg > 0 ? 0 : n - 1, i1 = sg > 0 ? n - 1 : 0;
    let d = OO[i0] * ko + WW[i0] * kw * sg;
    if (sg > 0) ctx.moveTo(RX[i0] + NX[i0] * d, RY[i0] + NY[i0] * d); else ctx.lineTo(RX[i0] + NX[i0] * d, RY[i0] + NY[i0] * d);
    for (let i = i0 + sg; i !== i1; i += sg) {
      d = OO[i] * ko + WW[i] * kw * sg;
      const j = i + sg, e = OO[j] * ko + WW[j] * kw * sg, x = RX[i] + NX[i] * d, y = RY[i] + NY[i] * d;
      ctx.quadraticCurveTo(x, y, (x + RX[j] + NX[j] * e) * 0.5, (y + RY[j] + NY[j] * e) * 0.5);
    }
    d = OO[i1] * ko + WW[i1] * kw * sg;
    ctx.lineTo(RX[i1] + NX[i1] * d, RY[i1] + NY[i1] * d);
  }

  function ribPath(ctx, n, ko, kw) {
    ctx.beginPath(); ribSide(ctx, n, ko, kw, 1); ribSide(ctx, n, ko, kw, -1); ctx.closePath(); ctx.fill();
  }

  function drawRibs(ctx, T) {
    const dk = sun.dk * (1 - 0.5 * clamp(T.fog, 0, 1)) * (1 - 0.45 * clamp(T.storm, 0, 1));
    for (const r of ribs) {
      if (!r.on || r.n < 2) continue;
      const e = smooth(r.age / 1.2) * (1 - smooth((r.age - r.life + 2) / 2)) * r.k * dk;
      if (e <= 0.01) continue;
      let n = 0;
      for (let i = 0; i < r.n; i++) { RX[n] = r.px[i]; RY[n] = r.py[i]; n++; }
      if (r.n >= r.np) { RX[0] += (RX[1] - RX[0]) * r.f; RY[0] += (RY[1] - RY[0]) * r.f; }
      RX[n] = r.x; RY[n] = r.y; n++;
      if (n < 3) continue;
      for (let i = 0; i < n; i++) {
        const i0 = i > 0 ? i - 1 : 0, i1 = i < n - 1 ? i + 1 : n - 1, tx = RX[i1] - RX[i0], ty = RY[i1] - RY[i0], m = Math.hypot(tx, ty) || 1;
        const u = i / (n - 1), env = Math.pow(Math.sin(Math.PI * u), 0.7) * (0.3 + 0.7 * Math.pow(u, 0.6));
        NX[i] = -ty / m; NY[i] = tx / m;
        WW[i] = r.w * env * (0.25 + 0.75 * Math.abs(Math.cos(r.tw + u * r.tk)));
        OO[i] = r.w * 4.5 * Math.sin(Math.PI * u) * Math.sin(r.ph + u * 3.4 - r.tw * 0.5);
      }
      ctx.fillStyle = ribHalo; ctx.globalAlpha = e * 0.1; ribPath(ctx, n, 0, 4);
      ctx.fillStyle = ribCol; ctx.globalAlpha = e * 0.22; ribPath(ctx, n, 1, 0.4);
      ctx.globalAlpha = e * 0.42; ribPath(ctx, n, 0, 1);
    }
  }

  function drawFlies(ctx) {
    const S = G.S, t = G.t;
    ctx.globalCompositeOperation = "lighter";
    for (let i = 0; i < 20; i++) {
      const p = motes[i];
      if (p.vis <= 0) continue;
      const bl = Math.pow(Math.max(0, Math.sin(t * (0.45 + 0.35 * p.gs) + p.ph * 3)), 2) * (0.4 + 0.6 * p.k);
      const a = (0.1 + 0.9 * bl) * smooth(p.age / 2.5) * smooth((p.life - p.age) / 2.5) * p.vis * ffK;
      if (a < 0.01) continue;
      const r = S * (0.013 + 0.016 * p.z) * (0.75 + 0.25 * bl), c = S * (0.0018 + 0.0018 * p.z);
      ctx.globalAlpha = a * 0.45; ctx.drawImage(SP.ffg, p.x - r, p.y - r, r * 2, r * 2);
      ctx.globalAlpha = a; ctx.drawImage(SP.ffc, p.x - c * 2, p.y - c * 2, c * 4, c * 4);
    }
    ctx.globalCompositeOperation = "source-over";
  }

  function drawMotes(ctx, T, near) {
    const S = G.S, Z = Math.max(S, 500), t = G.t, w = T.season === "winter", R2 = 1 / ((S * (w ? 0.85 : 0.5)) * (S * (w ? 0.85 : 0.5))), dk = sun.dk * (1 - ffK), sk = sun.k;
    if (ffK > 0 && !near) drawFlies(ctx);
    if (dk <= 0.01) return;
    for (let i = 0; i < MAXMOTE; i++) {
      const p = motes[i];
      if (p.vis <= 0 || (p.z > 0.8) !== !!near) continue;
      const dx = p.x - sun.x, dy = p.y - sun.y, L = Math.exp(-(dx * dx + dy * dy) * R2) * sk;
      const e = smooth(p.age / 2.5) * smooth((p.life - p.age) / 2.5) * p.vis;
      const gl = w ? Math.pow(Math.max(0, Math.sin(t * p.gs * 2.4 + p.ph)), 6) : Math.pow(Math.max(0, Math.sin(t * p.gs + p.ph)), 12);
      if (near) {
        const r = Z * (0.012 + 0.035 * (p.z - 0.8) / 0.2), a = (0.015 + 0.13 * L) * e * dk;
        if (a < 0.003) continue;
        const u = smooth((L - 0.2) / 0.25);
        if (u < 1) { ctx.globalAlpha = a * (1 - u); ctx.drawImage(SP.bok, p.x - r, p.y - r, r * 2, r * 2); }
        if (u > 0) { ctx.globalAlpha = a * u; ctx.drawImage(SP.bokL, p.x - r, p.y - r, r * 2, r * 2); }
        continue;
      }
      const r = Z * (0.0014 + 0.003 * p.z) * (1 + 0.5 * gl), a = (w ? 0.02 + 0.2 * L + 0.75 * gl * (0.3 + 0.7 * L) : 0.035 + 0.42 * L + 0.4 * gl * (0.2 + 0.8 * L)) * e * dk;
      if (a < 0.004) continue;
      const u = smooth((L - 0.22) / 0.26), q = Math.min(0.7, a);
      if (u < 1) { ctx.globalAlpha = q * (1 - u); ctx.drawImage(SP.dot, p.x - r * 2, p.y - r * 2, r * 4, r * 4); }
      if (u > 0) { ctx.globalAlpha = q * u; ctx.drawImage(SP.lit, p.x - r * 2, p.y - r * 2, r * 4, r * 4); }
      if (w && gl * (0.4 + L) > 0.12) { const q = Z * 0.028 * gl * (0.5 + p.z) * (0.6 + 0.8 * L); ctx.globalAlpha = Math.min(1, gl * e * dk * (0.35 + L)); ctx.drawImage(SP.stars[Math.floor(p.k * 4)], p.x - q, p.y - q, q * 2, q * 2); }
    }
  }

  function drawCarry(ctx, T) {
    const S = G.S, Z = Math.max(S, 500), dk = T.sun ? 1 : sun.dk * 0.8, fg = 0.65 * clamp(T.fog, 0, 1), R2 = 1 / ((S * 0.3) * (S * 0.3)), sk = T.sun ? sun.k : 0;
    for (let i = 0; i < MAXCARRY; i++) {
      const p = carry[i];
      if (p.vis <= 0 || !p.s) continue;
      const ks = KIND[p.kind];
      if (!ks) continue;
      const ca = Math.cos(p.ra), sa = Math.sin(p.ra), cb = Math.cos(p.rb), sb = Math.sin(p.rb), cc = Math.cos(p.rc), sc = Math.sin(p.rc);
      const r00 = ca * cc - sa * sb * sc, r01 = -sa * cb, r10 = sa * cc + ca * sb * sc, r11 = ca * cb, nz = cb * cc;
      const sz = Z * ks.sz * (0.45 + 1.2 * p.z * p.z), soft = p.z > 0.86;
      const img = nz >= 0 ? (soft ? p.s.fa : p.s.a) : soft ? p.s.fb : p.s.b;
      ctx.globalAlpha = ks.a * p.vis * dk * (0.82 + 0.18 * Math.abs(nz)) * (soft ? 0.62 : 1) * (1 - fg * (1 - p.z));
      put(ctx, r00 * sz, r10 * sz, r01 * sz, r11 * sz, p.x, p.y);
      ctx.drawImage(img, -B, -B, B * 2, B * 2);
      const dx = p.x - sun.x, dy = p.y - sun.y, L = Math.exp(-(dx * dx + dy * dy) * R2) * sk;
      if (L > 0.03) { ctx.globalCompositeOperation = "screen"; ctx.globalAlpha = L * 0.6 * p.vis; ctx.drawImage(img, -B, -B, B * 2, B * 2); ctx.globalCompositeOperation = "source-over"; }
    }
  }

  function drawSnow(ctx, T) {
    const S = G.S, Z = Math.max(S, 460), t = G.t, dk = 0.45 + 0.55 * sun.dk;
    for (let i = 0; i < snowN; i++) {
      const p = snowP[i], z = p.z;
      const sz = Z * (0.0035 + 0.007 * z + 0.04 * Math.pow(smooth((z - 0.45) / 0.55), 1.6));
      const a = (0.62 + 0.3 * z) * p.g * p.f * (1 - 0.72 * smooth((z - 0.5) / 0.5)) * (1 - smooth((z - 0.9) / 0.1)) * dk;
      if (a <= 0.004) continue;
      const x = p.x + Math.sin(t * p.w + p.ph) * S * 0.012 * (0.3 + z), y = p.y + Math.cos(t * p.w * 0.8 + p.ph) * S * 0.006 * (0.3 + z);
      if (z < 0.6) { ctx.globalAlpha = a; ctx.drawImage(z < 0.32 ? SP.fh : SP.fs, x - sz, y - sz, sz * 2, sz * 2); continue; }
      const u = smooth((z - 0.6) / 0.18);
      if (u < 1) { ctx.globalAlpha = a * (1 - u); ctx.drawImage(SP.fs, x - sz, y - sz, sz * 2, sz * 2); }
      ctx.globalAlpha = a * u; ctx.drawImage(SP.fb, x - sz, y - sz, sz * 2, sz * 2);
    }
  }

  function drawBolt(ctx, k) {
    if (flash.k > flash.bd || !bolt.length) return;
    const be = clamp((G.flash.e / flash.amp) * 1.3 + 0.55 * Math.exp(-flash.k / 0.2), 0, 1) * k * (1 - smooth((flash.k - flash.bd + 0.12) / 0.12)), g = clamp(flash.k / 0.12, 0, 1);
    if (be < 0.01) return;
    ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.strokeStyle = boltCol;
    for (let pass = 0; pass < 3; pass++) {
      for (const b of bolt) {
        const u = clamp((g - b.s) / Math.max(0.25, 1 - b.s), 0, 1), n = Math.ceil(u * (b.n - 1)) + 1;
        if (n < 2) continue;
        const lw = BW[pass][b.l];
        ctx.lineWidth = lw; ctx.globalAlpha = BA[pass] * be * (b.l ? 0.75 : 1);
        ctx.beginPath(); ctx.moveTo(b.x[0], b.y[0]);
        for (let i = 1; i < n; i++) ctx.lineTo(b.x[i], b.y[i]);
        ctx.stroke();
      }
    }
    ctx.lineCap = "butt"; ctx.lineJoin = "miter";
  }

  function drawFlash(ctx, pass) {
    const e = G.flash.e;
    if (e <= 0.004) return;
    const { W, H } = G, r = flash.r;
    ctx.save(); ctx.globalCompositeOperation = "screen";
    if (pass === 0) {
      ctx.globalAlpha = Math.min(1, 0.7 * e); ctx.drawImage(SP.glow, flash.x - r * 1.5, flash.y - r * 1.5, r * 3, r * 3);
      drawBolt(ctx, 1);
    } else {
      ctx.globalAlpha = 0.16 * e; ctx.drawImage(SP.glow, flash.x - r, flash.y - r, r * 2, r * 2);
      ctx.globalAlpha = 0.03 * e; ctx.fillStyle = liftCol; ctx.fillRect(-W * 0.12, -H * 0.12, W * 1.24, H * 1.24);
      drawBolt(ctx, 0.3);
    }
    ctx.restore();
  }

  function drawLens(ctx) {
    const W = G.W, H = G.H;
    if (lens.length) {
      const k = clamp(Math.sqrt(72000 / (W * H)), 0.25, 0.5), bw = Math.max(1, Math.round(W * k)), bh = Math.max(1, Math.round(H * k));
      if (!buf) { buf = cv(1); bufG = buf.getContext("2d"); }
      if (buf.width !== bw || buf.height !== bh) { buf.width = bw; buf.height = bh; bufN = 0; }
      if (bufN++ % 3 === 0) bufG.drawImage(G.canvas, 0, 0, bw, bh);
    }
    for (const b of beads) {
      const a = (1 - smooth((b.age - b.life + 3) / 3)) * 0.75, r = b.r * (1 - 0.4 * smooth(b.age / b.life));
      if (a <= 0.004) continue;
      ctx.globalAlpha = a; ctx.drawImage(SP.lens, b.x - r, b.y - r, r * 2, r * 2);
    }
    const bs = buf ? buf.width / W : 0;
    for (const p of lens) {
      if (p.a <= 0.004) continue;
      const rx = p.r * p.ax * (1 - 0.1 * p.sq), ry = (p.r / p.ax) * (1 + 0.22 * p.sq);
      if (p.run && p.y - p.ty > 2) { ctx.globalAlpha = p.a * 0.6; ctx.drawImage(SP.wet, p.x - rx * 0.5, p.ty, rx, p.y - p.ty); }
      const q = p.r * 2.6, sw = Math.min(q * 2 * bs, buf.width), sh = Math.min(q * 2 * bs, buf.height);
      const sx = clamp((p.x - q) * bs, 0, buf.width - sw), sy = clamp((p.y - q) * bs, 0, buf.height - sh);
      ctx.save(); ctx.globalAlpha = p.a;
      ctx.beginPath(); ctx.ellipse(p.x, p.y, rx, ry, 0, 0, TAU); ctx.clip();
      ctx.translate(p.x, p.y); ctx.scale(-1, -1);
      ctx.drawImage(buf, sx, sy, sw, sh, -rx, -ry, rx * 2, ry * 2);
      ctx.restore();
      ctx.globalAlpha = p.a; ctx.drawImage(SP.lens, p.x - rx, p.y - ry, rx * 2, ry * 2);
    }
    ctx.globalAlpha = 1;
  }

  function draw(pass) {
    const T = G.T, ctx = G.ctx;
    if (!SP) return;
    if (pass === 0) { drawFlash(ctx, 0); return; }
    if (pass === 2) { if (lens.length || beads.length) drawLens(ctx); return; }
    if (pass === 3) { ribT = G.t; drawRibs(ctx, T); ctx.globalAlpha = 1; return; }
    const { W, H } = G, m = ctx.getTransform();
    M.a = m.a; M.b = m.b; M.c = m.c; M.d = m.d; M.e = m.e; M.f = m.f;
    const veil = T.rain * 0.05 + T.fog * 0.1;
    if (veil > 0.004) { ctx.globalAlpha = veil; ctx.fillStyle = veilCol; ctx.fillRect(-W * 0.12, -H * 0.12, W * 1.24, H * 1.24); ctx.globalAlpha = 1; }
    drawFlash(ctx, 1);
    if (rainN) { drawRain(ctx, T); ctx.setTransform(M.a, M.b, M.c, M.d, M.e, M.f); }
    if (ribT !== G.t) drawRibs(ctx, T);
    drawMotes(ctx, T, 0);
    drawCarry(ctx, T);
    ctx.setTransform(M.a, M.b, M.c, M.d, M.e, M.f);
    if (snowN) drawSnow(ctx, T);
    drawMotes(ctx, T, 1);
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = "source-over";
  }

  return { build, air, flow, step, draw, strike };
})();
