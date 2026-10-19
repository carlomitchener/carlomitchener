const Light = (() => {
  const { TAU, clamp, lerp, smooth, noise, rng, parse, rgba, P } = Core;
  const LIN = new Float32Array(256), ENC = new Uint8ClampedArray(4097);
  for (let i = 0; i < 256; i++) { const c = i / 255; LIN[i] = c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); }
  for (let i = 0; i <= 4096; i++) { const v = i / 4096; ENC[i] = 255 * (v <= 0.0031308 ? v * 12.92 : 1.055 * Math.pow(v, 1 / 2.4) - 0.055); }
  const lin = (hex) => { const c = parse(hex); return [LIN[c[0]], LIN[c[1]], LIN[c[2]]]; };
  const hexOf = (c) => "#" + c.map((v) => ENC[clamp(Math.round(v * 4096), 0, 4096)].toString(16).padStart(2, "0")).join("");
  const blend = (a, b, t) => hexOf(lin(a).map((v, i) => v + (lin(b)[i] - v) * t));
  const F = (v, d) => (v === undefined || v === null ? d : v);
  const cv = (w, h) => { const c = document.createElement("canvas"); c.width = Math.max(1, Math.ceil(w)); c.height = Math.max(1, Math.ceil(h)); return c; };
  const ramp = (a, b, x) => smooth(clamp((x - a) / (b - a), 0, 1));
  const TU = Object.fromEntries(new URLSearchParams(location.search)), tu = (k, d) => (TU[k] !== undefined ? +TU[k] : d);
  const want = new Set((new URLSearchParams(location.search).get("optics") || "").split(","));
  const SPIN = 0.0032, SPECTRUM = ["#7a3cff", "#3060ff", "#1ec9f3", "#32cc58", "#ffd100", "#ff8f2c", "#ff3d40"].map(lin);

  let key = "", seed = 0, sprKey = "", moonKey = "", moonT = 0, wet = 0, meteor = null, nextMeteor = 18;
  const sun = { x: 0, y: 0, veil: 0 }, moon = { x: 0, y: 0 }, pole = { x: 0, y: 0 };
  const D = { w: 0, h: 0, cell: 8, lo: null, a: null, b: null, img: null, row: 0, p: null, fade: 1, busy: false, pend: false };
  let stars = [], starSpr = [], glowSpr = null, milky = null, mwJob = null, streak = null;
  const mwGeo = { ga: 0, gd: 0, len: 0 };
  let aure = null, corona = null, disc = null, rays = null, discR = 0, moonSpr = null, moonImg = null, moonAlb = null, moonPx = 0, halo = null, haloR = 0, cza = null, czaR = 0, bow = null, bowR = 0;

  const dark = () => clamp(F(G.T.dark, G.T.sun ? 0 : 1), 0, 1);
  const elev = () => clamp(F(G.T.sunElev, 0.7), 0, 1);
  const solar = () => F(G.T.solar, G.T.sun ? 0.5 : -0.4);
  const lowSun = () => 1 - smooth(clamp(elev() / 0.34, 0, 1));

  /* DOME */

  function domeAlloc() {
    D.cell = clamp(G.S / 100, 5, 9);
    D.w = Math.ceil(G.W * 1.16 / D.cell) + 1; D.h = Math.ceil(G.H * 1.16 / D.cell) + 1;
    D.lo = cv(D.w, D.h); D.a = cv(D.w * 3, D.h * 3); D.b = cv(D.w * 3, D.h * 3);
    D.img = D.lo.getContext("2d").createImageData(D.w, D.h);
  }

  function lab(c) {
    const l = Math.cbrt(0.4122214708 * c[0] + 0.5363325363 * c[1] + 0.0514459929 * c[2]), m = Math.cbrt(0.2119034982 * c[0] + 0.6806995451 * c[1] + 0.1073969566 * c[2]), s = Math.cbrt(0.0883024619 * c[0] + 0.2817188376 * c[1] + 0.6299787005 * c[2]);
    return [0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s, 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s, 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s];
  }

  function unlab(L, A, B, out, o) {
    const l = L + 0.3963377774 * A + 0.2158037573 * B, m = L - 0.1055613458 * A - 0.0638541728 * B, s = L - 0.0894841775 * A - 1.291485548 * B, l3 = l * l * l, m3 = m * m * m, s3 = s * s * s;
    out[o] = 4.0767416621 * l3 - 3.3077115913 * m3 + 0.2309699292 * s3;
    out[o + 1] = -1.2684380046 * l3 + 2.6097574011 * m3 - 0.3413193965 * s3;
    out[o + 2] = -0.0041960863 * l3 - 0.7034186147 * m3 + 1.707614701 * s3;
  }

  const RAD = new Float32Array(257 * 3);

  function radial(T, at) {
    const z = lab(lin(T.zenith)), m = lab(lin(T.mid)), r = lab(lin(T.rim)), k = [0, 0, 0];
    for (let c = 0; c < 3; c++) {
      const d0 = (m[c] - z[c]) / at, d1 = (r[c] - m[c]) / (1 - at);
      k[c] = d0 * d1 <= 0 ? 0 : (2 * d0 * d1) / (d0 + d1);
    }
    for (let i = 0; i <= 256; i++) {
      const s = i / 256, L = [0, 0, 0], lo = s < at, a = lo ? z : m, b = lo ? m : r, h = lo ? at : 1 - at, u = (lo ? s : s - at) / h, u2 = u * u, u3 = u2 * u;
      for (let c = 0; c < 3; c++) {
        const t0 = lo ? (m[c] - z[c]) / at : k[c], t1 = lo ? k[c] : (r[c] - m[c]) / (1 - at);
        L[c] = (2 * u3 - 3 * u2 + 1) * a[c] + (u3 - 2 * u2 + u) * h * t0 + (3 * u2 - 2 * u3) * b[c] + (u3 - u2) * h * t1;
      }
      unlab(L[0], L[1], L[2], RAD, i * 3);
    }
  }

  function domeParams() {
    const T = G.T, { W, H, S } = G, sol = solar(), up = ramp(-0.3, -0.06, sol), hz = clamp(F(T.haze, 0.5), 0, 1);
    const [sx, sy] = Mood.sunPos(), [mx, my] = Mood.moonPos();
    const Rm = (W + H) / 4, rx = lerp(W / 2, Rm, tu("dk", 0.7)), ry = lerp(H / 2, Rm, tu("dk", 0.7));
    radial(T, tu("dm", 0.55));
    const Z = lin(T.zenith), M = lin(T.mid), Gc = lin(T.glow), B = lin(T.belt);
    const su = (sx - W / 2) / rx, sv = (sy - H / 2) / ry, sr = Math.hypot(su, sv);
    const lo = 1 - smooth(clamp(sol / 0.4, 0, 1)), gA = clamp(F(T.glowA, 0.3), 0, 1) * up, bA = clamp(F(T.beltA, 0), 0, 1) * up;
    const sig = S * (0.17 + 0.12 * hz + 0.14 * lo), fog = clamp(F(T.fog, 0), 0, 1), st = clamp(F(T.storm, 0), 0, 1);
    const ml = clamp(F(T.moonlight, 0), 0, 1), msig = S * (0.22 + 0.2 * hz);
    return {
      cx: W / 2 - (sr > 1e-4 ? su / sr : 0) * rx * tu("do", 0.2) * (1 - 0.5 * lo), cy: H / 2 - (sr > 1e-4 ? sv / sr : -1) * ry * tu("do", 0.2) * (1 - 0.5 * lo), rx, ry, sp: tu("ds", 2), gW: gA * tu("dw", 0.4) * (0.3 + 0.7 * lo) * (1 - st), kn: tu("dn", 1.12), pw: tu("dp", 1.15), Gc, Gw: Gc.map((g) => lerp(g, 1, 0.45 * ramp(0.4, 0.72, sol))), B,
      Sh: Z.map((z, i) => lerp(z, M[i], 0.45) * 0.82), au: sr > 1e-4 ? su / sr : 0, av: sr > 1e-4 ? sv / sr : -1,
      sx, sy, isig: 1 / (sig * sig), gA: gA * (0.38 + 0.62 * lo * lo), aA: gA * (0.3 + 0.3 * hz) * (1 + 0.5 * fog) * (1 - 0.85 * st), aB: gA * 0.35 * (1 - 0.85 * st), am: clamp(0.35 + 0.45 * lo + 0.35 * (Math.max(...Gc) - Math.min(...Gc)) / (Math.max(...Gc) + 1e-4), 0, 0.92) * ramp(-0.02, 0.08, sol), sharp: 1 - lo, edge: st, bA,
      rb: lerp(0.84, 1.08, 1 - lo), wb: 1 / lerp(0.2, 0.55, 1 - lo), sA: bA * 0.8 * lo,
      mx, my, imsig: 1 / (msig * msig), mA: ml * (0.035 + 0.05 * hz), Mc: lin("#9fb2e6"),
    };
  }

  function domeRows(n) {
    const p = D.p, d = D.img.data, w = D.w, c = D.cell, x0 = -0.08 * G.W, y0 = -0.08 * G.H;
    const { Gc, Gw, B, Sh, Mc } = p;
    for (let k = 0; k < n && D.row < D.h; k++, D.row++) {
      const j = D.row, y = y0 + (j + 0.5) * c, v = (y - p.cy) / p.ry, dy = y - p.sy, ey = y - p.my;
      let o = j * w * 4;
      for (let i = 0; i < w; i++, o += 4) {
        const x = x0 + (i + 0.5) * c, u = (x - p.cx) / p.rx, r = p.sp === 2 ? Math.sqrt(u * u + v * v) : Math.pow(Math.pow(Math.abs(u), p.sp) + Math.pow(Math.abs(v), p.sp), 1 / p.sp), xr = r / p.kn, x2 = xr * xr, x6 = x2 * x2 * x2;
        const s = xr / Math.pow(1 + x6, 1 / 6), fi = Math.pow(s, p.pw) * 256, ii = Math.min(255, fi | 0), ft = fi - ii, l0 = ii * 3, l1 = l0 + 3;
        let cr = RAD[l0] + (RAD[l1] - RAD[l0]) * ft, cg = RAD[l0 + 1] + (RAD[l1 + 1] - RAD[l0 + 1]) * ft, cb = RAD[l0 + 2] + (RAD[l1 + 2] - RAD[l0 + 2]) * ft;
        const ca = r > 1e-5 ? (u * p.au + v * p.av) / r : 0, f = 0.5 + 0.5 * ca, f2 = f * f;
        const dx = x - p.sx, d2 = (dx * dx + dy * dy) * p.isig, lobe = f2 * (1 - p.sharp * (1 - f)), wc = p.aB / (1 + d2 * 9);
        const s2 = s * s, wh = p.gA * lobe * s2 * (1 + p.edge * (s2 * s2 * 2.2 - 1)) + p.gW * f2 * Math.min(1, r * 1.4), q1 = 1 + d2, wa = p.aA / (q1 * Math.sqrt(q1)) + wc, wt = wc / (wa + 1e-6), wm = 1 - Math.exp(-wa * p.am);
        const hm = 1 - Math.exp(-wh * p.am), hs = wh * (1 - p.am);
        cr += (Gc[0] - cr) * hm + Gc[0] * hs * (1 - cr); cg += (Gc[1] - cg) * hm + Gc[1] * hs * (1 - cg); cb += (Gc[2] - cb) * hm + Gc[2] * hs * (1 - cb);
        const gr = Gc[0] + (Gw[0] - Gc[0]) * wt, gg = Gc[1] + (Gw[1] - Gc[1]) * wt, gb = Gc[2] + (Gw[2] - Gc[2]) * wt, ws = wa * (1 - p.am);
        cr += (gr - cr) * wm + gr * ws * (1 - cr); cg += (gg - cg) * wm + gg * ws * (1 - cg); cb += (gb - cb) * wm + gb * ws * (1 - cb);
        if (p.bA > 0.001) {
          const fb = 1 - f, fb2 = fb * fb, e = (r - p.rb) * p.wb, wb = p.bA * fb2 * Math.exp(-e * e);
          cr += (B[0] - cr) * wb; cg += (B[1] - cg) * wb; cb += (B[2] - cb) * wb;
          if (p.sA > 0.001) {
            let h = clamp((r - 0.94) / 0.36, 0, 1); h = p.sA * fb2 * h * h * (3 - 2 * h);
            cr += (Sh[0] - cr) * h; cg += (Sh[1] - cg) * h; cb += (Sh[2] - cb) * h;
          }
        }
        if (p.mA > 0.0005) {
          const ex = x - p.mx, wm = p.mA / (1 + (ex * ex + ey * ey) * p.imsig);
          cr += Mc[0] * wm * (1 - cr); cg += Mc[1] * wm * (1 - cg); cb += Mc[2] * wm * (1 - cb);
        }
        d[o] = ENC[Math.max(0, Math.min(4096, cr * 4096)) | 0];
        d[o + 1] = ENC[Math.max(0, Math.min(4096, cg * 4096)) | 0];
        d[o + 2] = ENC[Math.max(0, Math.min(4096, cb * 4096)) | 0];
        d[o + 3] = 255;
      }
    }
    if (D.row < D.h) return;
    const ga = D.a.getContext("2d"), gb = D.b.getContext("2d");
    ga.globalAlpha = D.fade; ga.drawImage(D.b, 0, 0); ga.globalAlpha = 1;
    D.lo.getContext("2d").putImageData(D.img, 0, 0);
    gb.imageSmoothingEnabled = true; gb.imageSmoothingQuality = "high"; gb.drawImage(D.lo, 0, 0, D.b.width, D.b.height);
    D.fade = 0; D.busy = false;
  }

  function domeNow() {
    D.p = domeParams(); D.row = 0; D.busy = true; D.pend = false;
    domeRows(D.h);
    D.a.getContext("2d").drawImage(D.b, 0, 0);
    D.fade = 1;
  }

  /* SPRITES */

  function falloff(g, n, col, k, pw) {
    const gr = g.createRadialGradient(n / 2, n / 2, 0, n / 2, n / 2, n / 2);
    for (let i = 0; i <= 32; i++) {
      const x = i / 32, a = Math.pow(1 / (1 + (x / k) * (x / k)), pw) * (1 - x * x) * (1 - x * x);
      gr.addColorStop(x, rgba(col, a));
    }
    g.fillStyle = gr; g.fillRect(0, 0, n, n);
  }

  function makeAure(col) {
    const n = 256, c = cv(n, n);
    falloff(c.getContext("2d"), n, col, 0.16, 1.15);
    return c;
  }

  function makeDisc(core, limb) {
    const DPR = G.DPR, r = G.S * 0.05, n = Math.ceil((r + 2) * 2 * DPR), c = cv(n, n), g = c.getContext("2d"), e = r * DPR / (n / 2);
    const gr = g.createRadialGradient(n / 2, n / 2, 0, n / 2, n / 2, n / 2);
    gr.addColorStop(0, rgba(core, 1)); gr.addColorStop(e * 0.55, rgba(core, 1)); gr.addColorStop(e * 0.9, rgba(blend(core, limb, 0.6), 1));
    gr.addColorStop(Math.max(e * 0.9, e - 2.6 / (n / 2)), rgba(limb, 1)); gr.addColorStop(e, rgba(limb, 0)); gr.addColorStop(1, rgba(limb, 0));
    g.fillStyle = gr; g.fillRect(0, 0, n, n);
    discR = n / 2 / DPR;
    return c;
  }

  function makeCorona(col) {
    const n = 192, c = cv(n, n);
    falloff(c.getContext("2d"), n, col, 0.3, 1.7);
    return c;
  }

  function makeRays() {
    const n = 320, c = cv(n, n), g = c.getContext("2d"), img = g.createImageData(n, n), d = img.data, r = rng(4242), A = 720, prof = new Float32Array(A);
    for (let k = 0; k < 15; k++) {
      const a0 = (k + 0.5 + (r() - 0.5) * 0.7) / 15 * A, wd = A * (0.006 + 0.012 * r()), amp = 0.35 + 0.65 * r();
      for (let i = 0; i < A; i++) { let e = Math.abs(i - a0); e = Math.min(e, A - e) / wd; prof[i] += amp * Math.exp(-e * e); }
    }
    for (let k = 0; k < 9; k++) {
      const a0 = r() * A, wd = A * (0.02 + 0.02 * r()), amp = 0.2 * r();
      for (let i = 0; i < A; i++) { let e = Math.abs(i - a0); e = Math.min(e, A - e) / wd; prof[i] += amp * Math.exp(-e * e); }
    }
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      const dx = (x + 0.5) / n * 2 - 1, dy = (y + 0.5) / n * 2 - 1, rr = Math.hypot(dx, dy), o = (y * n + x) * 4;
      if (rr >= 1) continue;
      const ai = Math.floor(((Math.atan2(dy, dx) / TAU + 1) % 1) * A) % A;
      const rad = Math.pow(1 - rr, 2.2) * (1 - Math.exp(-rr * rr * 60));
      d[o] = d[o + 1] = d[o + 2] = 255; d[o + 3] = 255 * clamp(prof[ai] * rad, 0, 1);
    }
    g.putImageData(img, 0, 0);
    return c;
  }

  function sunLook() {
    const T = G.T, lo = lowSun(), fog = clamp(F(T.fog, 0), 0, 1);
    const glow = blend(blend("#fff8ea", T.glow, 0.3 + 0.6 * lo), "#f6f4f0", fog * 0.6), halo = blend(blend("#fff2d6", T.glow, 0.2 + 0.75 * lo), "#f8f6f2", fog * 0.6);
    const core = blend(blend("#fffffc", "#ffefcc", lo), "#fbfaf6", fog * 0.5), limb = blend(blend(core, "#fff0cc", 0.6), T.glow, 0.3 * lo);
    return { glow, halo, core, limb };
  }

  function sprites() {
    const L = sunLook(), k = [L.glow, L.halo, L.core, L.limb, G.S, G.DPR].join();
    if (k === sprKey) return;
    sprKey = k;
    aure = makeAure(L.glow);
    corona = makeCorona(L.halo);
    disc = makeDisc(L.core, L.limb);
  }

  /* STARS */

  function starSprites() {
    const DPR = G.DPR, cols = ["#f3f5ff", "#c9d8ff", "#fff1d6", "#ffd8ae"];
    starSpr = cols.map((col) => [0.55, 0.8, 1.1, 1.5].map((r) => {
      const R = r * 2.6, n = Math.ceil(R * 2 * DPR) + 2, c = cv(n, n), g = c.getContext("2d"), gr = g.createRadialGradient(n / 2, n / 2, 0, n / 2, n / 2, R * DPR);
      gr.addColorStop(0, rgba(col, 1)); gr.addColorStop(0.3, rgba(col, 0.85)); gr.addColorStop(0.55, rgba(col, 0.28)); gr.addColorStop(1, rgba(col, 0));
      g.fillStyle = gr; g.fillRect(0, 0, n, n);
      return { c, R: (n / DPR) / 2 };
    }));
    const n = Math.ceil(18 * DPR), c = cv(n, n);
    falloff(c.getContext("2d"), n, "#e8eeff", 0.12, 1.3);
    glowSpr = c;
    const sw = 256, sh = 12, s = cv(sw, sh), sg = s.getContext("2d"), lg = sg.createLinearGradient(0, 0, sw, 0);
    lg.addColorStop(0, rgba("#d8e4ff", 0)); lg.addColorStop(0.7, rgba("#e8eeff", 0.35)); lg.addColorStop(0.96, rgba(P.white, 1)); lg.addColorStop(1, rgba(P.white, 0));
    sg.fillStyle = lg; sg.fillRect(0, 0, sw, sh);
    sg.globalCompositeOperation = "destination-in";
    const vg = sg.createLinearGradient(0, 0, 0, sh);
    vg.addColorStop(0, rgba(P.white, 0)); vg.addColorStop(0.5, rgba(P.white, 1)); vg.addColorStop(1, rgba(P.white, 0));
    sg.fillStyle = vg; sg.fillRect(0, 0, sw, sh);
    streak = s;
  }

  function seedStars() {
    const { W, H } = G, r = rng(seed + 17), px = W * 0.16, py = H * 0.86;
    pole.x = px; pole.y = py;
    const far = Math.max(Math.hypot(px, py), Math.hypot(W - px, py), Math.hypot(px, H - py), Math.hypot(W - px, H - py)) + 24;
    const vis = clamp(Math.pow(W * H, 0.75) * 0.0105, 110, 380), total = Math.round(vis * Math.PI * far * far / (W * H));
    const ga = Math.atan2(H * 0.42 - py, W * 0.6 - px), gd = Math.hypot(W * 0.6 - px, H * 0.42 - py), nx = -Math.sin(ga), ny = Math.cos(ga);
    stars = [];
    const add = (x, y, b) => {
      const u = r(), ci = b > 0.6 && u < 0.35 ? (u < 0.12 ? 3 : u < 0.24 ? 2 : 1) : u < 0.2 ? 1 : u < 0.34 ? 2 : 0;
      stars.push({ x, y, b, thr: 0.3 + 0.62 * (1 - b), a: 0.35 + 0.65 * b, s: b > 0.9 ? 3 : b > 0.7 ? 2 : b > 0.4 ? 1 : 0, c: ci, f: 0.35 + r() * 1.1, ph: r() * TAU, f2: 0.13 + r() * 0.4, ph2: r() * TAU, big: b > 0.9 });
    };
    for (let i = 0; i < total; i++) { const rr = far * Math.sqrt(r()), a = r() * TAU; add(Math.cos(a) * rr, Math.sin(a) * rr, Math.pow(r(), 3.4)); }
    const extra = Math.round(total * 0.35);
    for (let i = 0; i < extra; i++) {
      const s = (r() * 2 - 1) * far, w = (r() + r() + r() - 1.5) * G.S * 0.09;
      add(Math.cos(ga) * gd + nx * s + Math.cos(ga) * w, Math.sin(ga) * gd + ny * s + Math.sin(ga) * w, Math.pow(r(), 5) * 0.7);
    }
    mwGeo.ga = ga; mwGeo.gd = gd; mwGeo.len = far * 2;
    milky = null; mwJob = milkyStart(far * 2, G.S * 0.52);
  }

  function milkyStart(len, wid) {
    const k = 8, w = Math.ceil(len / k), h = Math.ceil(wid / k), lo = cv(w, h), img = lo.getContext("2d").createImageData(w, h), r = rng(seed + 31);
    return { len, wid, w, h, lo, img, al: new Float32Array(w * h), y: 0, r, off: r() * 100, core: (r() - 0.5) * 0.6, warm: lin("#ffe8cc"), cool: lin("#d2dcff") };
  }

  function milkyRows(n) {
    const J = mwJob, { w, h, al, off, core, warm, cool } = J, d = J.img.data;
    const fbm = (x, y) => { let s = 0, a = 0.5, f = 1; for (let o = 0; o < 3; o++) { const yy = y * f + o * 3.1, fy = yy - Math.floor(yy), xx = x * f + off + o * 7.3; s += a * (noise(xx, Math.floor(yy)) * (1 - fy) + noise(xx, Math.floor(yy) + 1) * fy); a *= 0.5; f *= 2.03; } return s; };
    for (let k = 0; k < n && J.y < h; k++, J.y++) {
      const y = J.y;
      for (let x = 0; x < w; x++) {
        const s = x / w * 2 - 1, v = (y + 0.5) / h * 2 - 1, o = (y * w + x) * 4, n1 = fbm(x / 9, y / 4), n2 = fbm(x / 3.2 + 40, y / 2);
        const ac = (s - core) / 0.6, along = 0.3 + 0.7 * Math.exp(-ac * ac), vv = v + 0.14 * n1 - 0.4 * (s * s - 0.2), b1 = vv / 0.26, b2 = vv / 0.62;
        const rz = (vv - 0.05 - 0.09 * n2) / 0.08, rift = 1 - 0.6 * Math.exp(-rz * rz) * along, I = clamp((0.72 * Math.exp(-b1 * b1) + 0.28 * Math.exp(-b2 * b2)) * rift * along * (0.62 + 0.62 * n2 + 0.2 * n1), 0, 1), wm = along * along * 0.55;
        al[y * w + x] = I;
        d[o] = ENC[Math.min(4096, (cool[0] + (warm[0] - cool[0]) * wm) * 4096) | 0];
        d[o + 1] = ENC[Math.min(4096, (cool[1] + (warm[1] - cool[1]) * wm) * 4096) | 0];
        d[o + 2] = ENC[Math.min(4096, (cool[2] + (warm[2] - cool[2]) * wm) * 4096) | 0];
        d[o + 3] = 165 * I;
      }
    }
    if (J.y < h) return;
    J.lo.getContext("2d").putImageData(J.img, 0, 0);
    const K = 2, w2 = Math.ceil(J.len / K), h2 = Math.ceil(J.wid / K), c = cv(w2, h2), g = c.getContext("2d"), r = J.r, m = Math.round(w2 * h2 * 0.07);
    g.imageSmoothingEnabled = true; g.imageSmoothingQuality = "high"; g.drawImage(J.lo, 0, 0, w2, h2);
    for (let i = 0; i < m; i++) {
      const x = Math.floor(r() * w2), y = Math.floor(r() * h2), a = al[Math.min(h - 1, Math.floor(y / h2 * h)) * w + Math.min(w - 1, Math.floor(x / w2 * w))];
      if (r() > a * a * 1.6) continue;
      const b = 0.3 + 0.7 * r() * r(), t = r();
      g.globalAlpha = b; g.fillStyle = t < 0.5 ? "#e6ecff" : "#fff8f0"; g.fillRect(x, y, 1, 1);
    }
    milky = c; mwJob = null;
  }

  /* MOON */

  const MARIA = [[-0.3, -0.36, 0.26, 0.22, 0.62], [0.17, -0.36, 0.15, 0.13, 0.55], [0.33, -0.08, 0.18, 0.15, 0.58], [0.64, -0.25, 0.09, 0.11, 0.6], [0.52, 0.15, 0.1, 0.15, 0.45], [0.3, 0.31, 0.08, 0.07, 0.42], [-0.62, -0.02, 0.2, 0.4, 0.5], [-0.42, 0.24, 0.16, 0.14, 0.38], [-0.15, 0.37, 0.15, 0.11, 0.42], [-0.44, 0.38, 0.07, 0.07, 0.4], [0.02, -0.68, 0.36, 0.07, 0.34], [0.01, -0.1, 0.08, 0.07, 0.3], [-0.12, 0.72, 0.035, 0.035, -0.6], [-0.28, -0.08, 0.03, 0.03, -0.4], [0.0, 0.55, 0.35, 0.22, -0.18]];

  function moonAlbedo(n) {
    const a = new Float32Array(n * n);
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      const u = (x + 0.5) / n * 2 - 1, v = (y + 0.5) / n * 2 - 1, w = 0.85 + 0.15 * Math.sin(u * 17 + v * 9) * Math.sin(v * 13 - u * 7);
      let s = 0;
      for (const [mx, my, rx, ry, md] of MARIA) { const e = ((u - mx) / rx) * ((u - mx) / rx) + ((v - my) / ry) * ((v - my) / ry); if (e < 9) s += md * Math.exp(-e * e * 0.5) * (md > 0 ? w : 1); }
      a[y * n + x] = clamp(1 - 0.55 * s, 0.42, 1.12);
    }
    return a;
  }

  function moonAlloc() {
    const n = Math.ceil((G.S * 0.042 + 2) * 2 * G.DPR);
    if (moonPx === n) return;
    moonAlb = moonAlbedo(n); moonPx = n; moonSpr = cv(n, n); moonImg = moonSpr.getContext("2d").createImageData(n, n); moonKey = "";
  }

  function makeMoon(phase, ang, dk, warm) {
    const DPR = G.DPR, r = G.S * 0.042, n = moonPx, rp = r * DPR, c = moonSpr, g = c.getContext("2d"), img = moonImg, d = img.data;
    d.fill(0);
    const sn = Math.abs(Math.sin(TAU * phase)), lx = Math.cos(ang) * sn, ly = Math.sin(ang) * sn, lz = -Math.cos(TAU * phase);
    const illum = (1 + lz) / 2, es = (0.04 + 0.2 * (1 - illum) * (1 - illum)) * dk, day = 1 - dk;
    const face = lin(blend(day > 0.5 ? "#f6f7fb" : "#fff9ea", "#ffe4c8", warm)), mare = lin(blend(day > 0.5 ? "#b2bed8" : "#aab0bc", "#d8b8a8", warm * 0.6)), earth = lin("#7c8cb8");
    const e = 0.06, m = n / 2;
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      const u = (x + 0.5 - m) / rp, v = (y + 0.5 - m) / rp, rr = u * u + v * v, o = (y * n + x) * 4;
      const edge = clamp((1 - Math.sqrt(rr)) * rp + 0.5, 0, 1);
      if (edge <= 0) continue;
      const nz = Math.sqrt(Math.max(0, 1 - rr)), dot = u * lx + v * ly + nz * lz, t = clamp((dot + e) / (2 * e), 0, 1), lit = t * t * (3 - 2 * t);
      const al = moonAlb[y * n + x], tex = clamp((al - 0.42) / 0.62, 0, 1.15), sh = 0.8 + 0.2 * Math.sqrt(nz);
      const fr = (mare[0] + (face[0] - mare[0]) * tex) * sh, fg = (mare[1] + (face[1] - mare[1]) * tex) * sh, fb = (mare[2] + (face[2] - mare[2]) * tex) * sh;
      const al1 = lit * (day > 0.5 ? (0.5 + 0.5 * dk) * (0.55 + 0.45 * Math.min(1, tex)) : 1), ae = es * (1 - lit) * (0.7 + 0.3 * tex) * (1 - al1), a = Math.min(1, al1 + ae), k = a > 0 ? 1 / a : 0;
      d[o] = ENC[Math.min(4096, (fr * al1 + earth[0] * ae) * k * 4096) | 0];
      d[o + 1] = ENC[Math.min(4096, (fg * al1 + earth[1] * ae) * k * 4096) | 0];
      d[o + 2] = ENC[Math.min(4096, (fb * al1 + earth[2] * ae) * k * 4096) | 0];
      d[o + 3] = 255 * a * edge;
    }
    g.putImageData(img, 0, 0);
    return c;
  }

  /* OPTICS */

  function ring(r0, r1, span, paint) {
    const k = 2, ext = r1, w = Math.ceil(ext / k), h = Math.ceil(2 * ext / k), c = cv(w, h), g = c.getContext("2d"), img = g.createImageData(w, h), d = img.data;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const px = (x + 0.5) * k, py = (y + 0.5) * k - ext, rr = Math.hypot(px, py), a = Math.abs(Math.atan2(py, px)), o = (y * w + x) * 4;
      const win = 1 - ramp(span * 0.55, span, a);
      if (win <= 0 || rr < r0 || rr > r1) continue;
      const col = paint(rr);
      if (!col) continue;
      d[o] = ENC[Math.min(4096, col[0] * 4096) | 0]; d[o + 1] = ENC[Math.min(4096, col[1] * 4096) | 0]; d[o + 2] = ENC[Math.min(4096, col[2] * 4096) | 0];
      d[o + 3] = 255 * clamp(col[3] * win, 0, 1);
    }
    g.putImageData(img, 0, 0);
    c.ext = ext;
    return c;
  }

  function spectral(z, rev) {
    const t = clamp((rev ? -z : z) * 0.5 + 0.5, 0, 1), f = t * (SPECTRUM.length - 1), i = Math.min(SPECTRUM.length - 2, Math.floor(f)), u = f - i, a = SPECTRUM[i], b = SPECTRUM[i + 1];
    return [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, a[2] + (b[2] - a[2]) * u];
  }

  function makeCza(rad) {
    const wid = G.S * 0.026;
    return ring(rad - wid * 2.5, rad + wid * 2.5, 1.15, (rr) => {
      const z = (rr - rad) / wid, env = Math.exp(-z * z * 1.1);
      if (env < 0.01) return null;
      const s = spectral(z * 0.85, false);
      return [s[0], s[1], s[2], env];
    });
  }

  function makeBow(rad) {
    const wid = G.S * 0.02;
    return ring(rad - wid * 4, rad * 1.215 + wid * 4, 1.25, (rr) => {
      const zp = (rr - rad) / wid, z = (rr - rad * 1.215) / wid;
      let r = 0, g = 0, b = 0, a = 0;
      const e1 = Math.exp(-zp * zp * 0.9);
      if (e1 > 0.01) { const s = spectral(zp * 0.8, false); r += s[0] * e1; g += s[1] * e1; b += s[2] * e1; a += e1; }
      const zs = z / 1.7, e2 = Math.exp(-zs * zs * 0.9) * 0.4;
      if (e2 > 0.01) { const s = spectral(zs * 0.8, true); r += s[0] * e2; g += s[1] * e2; b += s[2] * e2; a += e2; }
      const sup = zp < -1.2 ? 0.18 * Math.exp(-(zp + 2.2) * (zp + 2.2) * 1.5) : 0;
      if (sup > 0.005) { r += 0.9 * sup; g += 0.55 * sup; b += 0.75 * sup; a += sup; }
      const ins = zp < 0 ? 0.1 * ramp(-4, -1.2, zp) * (1 - ramp(-1.2, 0, zp)) : 0;
      if (ins > 0.004) { r += ins; g += ins; b += ins; a += ins; }
      if (a < 0.01) return null;
      return [r / a, g / a, b / a, Math.min(1, a)];
    });
  }

  function makeHalo(rad) {
    const wid = G.S * 0.05;
    return ring(rad - wid, rad + wid * 4, Math.PI + 0.01, (rr) => {
      const z = (rr - rad) / wid;
      if (z < -0.6) return null;
      const rise = ramp(-0.6, 0, z), fall = Math.exp(-Math.max(0, z) * 1.25), a = rise * fall;
      if (a < 0.01) return null;
      const t = clamp(z / 1.6, 0, 1), red = lin("#ffb49a"), wht = lin("#e8eeff");
      return [red[0] + (wht[0] - red[0]) * t, red[1] + (wht[1] - red[1]) * t, red[2] + (wht[2] - red[2]) * t, a];
    });
  }

  function luck(k, per) { return want.has("off") ? 0 : ramp(0.3, 0.62, noise(G.t / per + (seed % 997) * 0.37, k)); }

  /* BUILD */

  let sized = "";
  function build(resized) {
    if (!seed) seed = G.seed ? 1 + Math.abs(G.seed * 7919 + 104729) % 1e9 : 1 + Math.floor(Math.random() * 1e9);
    const sz = [G.W, G.H, G.DPR].join();
    if (sz !== sized) { sized = sz; domeAlloc(); starSprites(); seedStars(); moonAlloc(); rays = rays || makeRays(); halo = cza = bow = null; }
    key = G.T.key;
    domeNow();
    sprites();
  }

  function step(dt) {
    const T = G.T;
    if (T.key !== key) { key = T.key; D.pend = true; sprites(); }
    if (D.pend && !D.busy) { D.p = domeParams(); D.row = 0; D.busy = true; D.pend = false; }
    if (D.busy) domeRows(Math.ceil(D.h / 7));
    if (D.fade < 1) D.fade = Math.min(1, D.fade + dt / 0.7);
    const [sx, sy] = Mood.sunPos(), [mx, my] = Mood.moonPos();
    sun.x = sx; sun.y = sy; moon.x = mx; moon.y = my;
    sun.veil = typeof Clouds !== "undefined" && Clouds.veil ? clamp(Clouds.veil(sx, sy), 0, 1) : 0;
    moonT -= dt;
    wet = Math.max(wet * Math.exp(-dt / 45), smooth(clamp(F(T.rain, 0) / 0.5, 0, 1)));
    if (mwJob && dark() > 0.45) milkyRows(4);
    stepMeteor(dt);
  }

  function stepMeteor(dt) {
    const T = G.T, ok = dark() > 0.7 && F(T.rain, 0) < 0.05 && F(T.fog, 0) < 0.3 && F(T.cover, 0.4) < 0.8;
    if (meteor) { meteor.age += dt; if (meteor.age > meteor.life) meteor = null; return; }
    nextMeteor -= dt * (ok ? 1 : 0) * (want.has("meteor") ? 12 : 1);
    if (nextMeteor > 0) return;
    const r = rng(seed + Math.floor(G.t * 10)), { W, H, S } = G;
    nextMeteor = 14 + r() * 40;
    const a = r() * TAU, x = W * (0.15 + 0.7 * r()), y = H * (0.12 + 0.6 * r());
    meteor = { x, y, dx: Math.cos(a), dy: Math.sin(a), sp: S * (0.5 + 0.4 * r()), len: S * (0.1 + 0.08 * r()), age: 0, life: 0.55 + 0.4 * r(), b: 0.5 + 0.5 * r() };
  }

  /* PAINT */

  function drawSky() {
    const { ctx, W, H } = G, w = D.w * D.cell, h = D.h * D.cell, x = -0.08 * W, y = -0.08 * H;
    ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = "low";
    if (D.fade < 1) { ctx.drawImage(D.a, x, y, w, h); ctx.globalAlpha = D.fade; }
    ctx.drawImage(D.b, x, y, w, h);
    ctx.globalAlpha = 1;
    drawOptics();
  }

  function drawOptics() {
    const { ctx, T, W, H } = G, deg = elev() * 90;
    if (!T.sun && !want.has("halo") && F(T.moonlight, 0) < 0.05) return;
    const clean = (1 - clamp(F(T.rain, 0) * 2, 0, 1)) * (1 - F(T.storm, 0)) * (1 - clamp(F(T.fog, 0) * 1.4, 0, 1));
    const Rm = (W + H) / 4, cx = W / 2, cy = H / 2;
    ctx.save(); ctx.globalCompositeOperation = "screen";
    if (T.sun) {
      const cz = want.has("arc") ? 1 : luck(61, 70) * clean * ramp(8, 18, deg) * (1 - ramp(26, 32, deg));
      if (cz > 0.01) {
        const ref = Math.round(Rm * 0.42), k = Rm * (44 - Math.min(deg, 30)) / 90 * 1.45 / ref;
        if (!cza || czaR !== ref) { cza = makeCza(ref); czaR = ref; }
        ctx.globalAlpha = 0.24 * cz * (1 - 0.6 * dark());
        ctx.translate(cx, cy); ctx.rotate(Math.atan2(sun.y - cy, sun.x - cx)); ctx.scale(k, k);
        ctx.drawImage(cza, 0, -cza.ext, cza.width * 2, cza.height * 2);
      }
    }
    ctx.restore();
    ctx.save(); ctx.globalCompositeOperation = "screen";
    if (T.sun) {
      const bw = want.has("bow") ? 1 : wet * (1 - smooth(clamp(F(T.rain, 0) / 0.3, 0, 1))) * (1 - F(T.storm, 0) * 0.6) * (1 - clamp(F(T.fog, 0) * 1.5, 0, 1)) * (1 - ramp(38, 46, deg));
      if (bw > 0.01) {
        const rad = Math.round(Rm * 42 / 90 * 1.08 / 4) * 4, ang = Math.atan2(sun.y - cy, sun.x - cx) + Math.PI, dist = Rm * (90 + deg) / 90 * 1.08;
        if (!bow || bowR !== rad) { bow = makeBow(rad); bowR = rad; }
        ctx.globalAlpha = 0.42 * bw * (1 - 0.5 * dark());
        ctx.translate(cx + Math.cos(ang) * dist, cy + Math.sin(ang) * dist); ctx.rotate(ang + Math.PI);
        ctx.drawImage(bow, 0, -bow.ext, bow.width * 2, bow.height * 2);
      }
    }
    ctx.restore();
  }

  function drawStars() {
    const { ctx, W, H, t, T, S } = G, d = dark();
    const fog = clamp(F(T.fog, 0), 0, 1), over = clamp((F(T.cover, 0.4) - 0.5) / 0.4, 0, 1), dk = d * (1 - 0.9 * fog) * (1 - 0.6 * F(T.storm, 0)) * (1 - 0.5 * F(T.rain, 0)) * (1 - 0.8 * F(T.snow, 0)) * (1 - 0.35 * over) * (1 - 0.25 * clamp(F(T.haze, 0.5) - 0.4, 0, 1));
    if (dk <= 0.3) return drawGlint(dk, d);
    const th = t * SPIN, c = Math.cos(th), s = Math.sin(th), px = pole.x, py = pole.y, ml = clamp(F(T.moonlight, 0), 0, 1), mu = moon.x, mv = moon.y, im = 1 / (S * S * 0.16);
    const mw = ramp(0.8, 0.97, dk) * (1 - 0.85 * ml) * (1 - over) * 0.42;
    if (mw > 0.01 && milky) {
      const len = mwGeo.len;
      ctx.save(); ctx.globalCompositeOperation = "screen"; ctx.globalAlpha = mw;
      ctx.translate(px, py); ctx.rotate(th + mwGeo.ga); ctx.translate(mwGeo.gd, 0); ctx.rotate(Math.PI / 2);
      ctx.drawImage(milky, -len / 2, -S * 0.26, len, S * 0.52);
      ctx.restore();
    }
    const mx = W * 0.06, my = H * 0.06, cx = W / 2, cy = H / 2, ir = 4 / (W * W + H * H), hide = F(T.lunar, -1) > -0.03 ? S * S * 0.002 : -1;
    for (let i = 0; i < stars.length; i++) {
      const st = stars[i], x = px + c * st.x - s * st.y, y = py + s * st.x + c * st.y;
      if (x < -mx || y < -my || x > W + mx || y > H + my) continue;
      const ex = x - mu, ey = y - mv, e2 = ex * ex + ey * ey;
      if (e2 < hide) continue;
      const near = ml * Math.exp(-e2 * im), v = clamp((dk - st.thr - 0.55 * near) * 4, 0, 1);
      if (v <= 0.01) continue;
      const rx = x - cx, ry = y - cy, rim = Math.min(1, (rx * rx + ry * ry) * ir), amp = 0.12 + 0.3 * rim + (st.big ? 0.12 : 0);
      const tw = 0.5 + 0.5 * Math.sin(t * st.f + st.ph) * Math.sin(t * st.f2 + st.ph2), a = st.a * v * (1 - amp * tw);
      const sp = starSpr[st.c][st.s];
      ctx.globalAlpha = a;
      ctx.drawImage(sp.c, x - sp.R, y - sp.R, sp.R * 2, sp.R * 2);
      if (st.big) { ctx.globalAlpha = a * 0.22; ctx.drawImage(glowSpr, x - 9, y - 9, 18, 18); }
    }
    ctx.globalAlpha = 1;
    drawGlint(dk, d);
    if (meteor) drawMeteor(dk);
  }

  function drawGlint(dk, d) {
    const { ctx, W, H } = G, sol = solar();
    const vis = ramp(-0.26, -0.12, sol) * (1 - ramp(0.04, 0.12, sol)) * ramp(0.25, 0.5, dk);
    if (vis <= 0.01) return;
    const sx = sun.x, sy = sun.y, x = sx + (W / 2 - sx) * 0.42 + (H / 2 - sy) * 0.12, y = sy + (H / 2 - sy) * 0.42 - (W / 2 - sx) * 0.08;
    const tw = 0.9 + 0.1 * Math.sin(G.t * 1.3);
    ctx.globalAlpha = vis * tw; ctx.drawImage(glowSpr, x - 11, y - 11, 22, 22);
    const sp = starSpr[2][3]; ctx.globalAlpha = vis; ctx.drawImage(sp.c, x - sp.R * 1.2, y - sp.R * 1.2, sp.R * 2.4, sp.R * 2.4);
    ctx.globalAlpha = 1;
  }

  function drawMeteor(dk) {
    const { ctx } = G, m = meteor, u = m.age / m.life, env = Math.pow(Math.sin(Math.PI * clamp(u, 0, 1)), 0.8) * m.b * ramp(0.6, 0.85, dk);
    if (env <= 0.01) return;
    const hx = m.x + m.dx * m.sp * m.age, hy = m.y + m.dy * m.sp * m.age, len = m.len * Math.min(1, m.age / 0.18);
    ctx.save(); ctx.globalCompositeOperation = "screen"; ctx.globalAlpha = env;
    ctx.translate(hx, hy); ctx.rotate(Math.atan2(m.dy, m.dx));
    ctx.drawImage(streak, -len, -2, len, 4);
    ctx.restore();
  }

  function drawMoon(pass) {
    const { ctx, T, S } = G, up = ramp(-0.03, 0.04, F(T.lunar, T.sun ? -1 : 0.5)), d = dark();
    const p = clamp(F(T.moon, 0.5), 0, 1), illum = (1 - Math.cos(TAU * p)) / 2;
    if (up <= 0.01 || illum < 0.015) return;
    const fog = clamp(F(T.fog, 0), 0, 1), storm = F(T.storm, 0), lowM = 1 - smooth(clamp(F(T.lunar, 0.5) / 0.3, 0, 1));
    const r = S * (0.034 + 0.008 * lowM), mx = moon.x, my = moon.y, dayA = lerp(0.5, 1, d) * (1 - 0.6 * fog) * (1 - 0.85 * storm) * up;
    if (dayA <= 0.01) return;
    if (pass === 0) {
      const ang = Math.atan2(sun.y - my, sun.x - mx), dk = Math.round(d * 8) / 8, wm = Math.round(lowM * 0.55 * 8) / 8, mk = [Math.round(p * 400), Math.round(ang * 40), dk, wm, G.DPR, S].join();
      if (mk !== moonKey && (moonT <= 0 || !moonKey)) { makeMoon(p, ang, dk, wm); moonKey = mk; moonT = 0.3; }
      ctx.save(); ctx.globalCompositeOperation = "screen";
      const ha = (0.1 + 0.32 * illum) * d * dayA * (1 + 0.6 * clamp(F(T.haze, 0.5) - 0.4, 0, 1)), R = r * (6 + 4 * fog);
      if (ha > 0.01) { ctx.globalAlpha = ha; ctx.drawImage(moonGlow(), mx - R, my - R, R * 2, R * 2); }
      const hl = want.has("halo") ? 1 : luck(67, 80) * clamp(F(T.moonlight, 0) * 1.6, 0, 1) * humid();
      if (hl > 0.01) {
        const rad = Math.round(S * 0.22 / 4) * 4;
        if (!halo || haloR !== rad) { halo = makeHalo(rad); haloR = rad; }
        ctx.globalAlpha = 0.2 * hl; ctx.translate(mx, my);
        ctx.drawImage(halo, 0, -halo.ext, halo.width * 2, halo.height * 2); ctx.scale(-1, 1); ctx.drawImage(halo, 0, -halo.ext, halo.width * 2, halo.height * 2);
      }
      ctx.restore();
      const w = (moonSpr.width / G.DPR) * r / (S * 0.042);
      ctx.globalAlpha = dayA; ctx.drawImage(moonSpr, mx - w / 2, my - w / 2, w, w); ctx.globalAlpha = 1;
    } else {
      const ba = 0.22 * illum * d * dayA * (1 - 0.5 * fog), R = r * 3.2;
      if (ba <= 0.01) return;
      ctx.save(); ctx.globalCompositeOperation = "screen"; ctx.globalAlpha = ba;
      ctx.drawImage(moonGlow(), mx - R, my - R, R * 2, R * 2);
      ctx.restore();
    }
  }

  let mglow = null;
  function moonGlow() {
    if (mglow) return mglow;
    const n = 256, c = cv(n, n);
    falloff(c.getContext("2d"), n, "#c6d2f4", 0.1, 1.1);
    return (mglow = c);
  }

  function humid() {
    const T = G.T;
    return clamp(0.35 + 0.5 * clamp((F(T.cover, 0.4) - 0.4) / 0.35, 0, 1) + 0.4 * F(T.snow, 0) - 1.5 * F(T.rain, 0) - F(T.storm, 0), 0, 1);
  }

  function drawSun(pass) {
    const { ctx, T, S, t } = G;
    drawMoon(pass);
    if (!T.sun) return;
    const lo = lowSun(), d = dark(), fog = clamp(F(T.fog, 0), 0, 1), storm = clamp(F(T.storm, 0), 0, 1), cover = clamp(F(T.cover, 0.4), 0, 1);
    const over = clamp((cover - 0.45) / 0.4, 0, 1) + clamp(F(T.snow, 0), 0, 1) * 0.5, dif = clamp(Math.max(fog, over * 0.6), 0, 1);
    const set = ramp(-0.005, 0.03, solar()), br = (1 - d * 0.55) * (1 - 0.88 * storm) * (1 - 0.35 * fog) * (1 - 0.3 * over) * set, veil = sun.veil;
    if (br <= 0.01) return;
    const r = S * (0.031 + 0.016 * lo) * (1 + 0.25 * dif), sx = sun.x, sy = sun.y;
    if (pass === 0) {
      ctx.save(); ctx.globalCompositeOperation = "screen";
      const A = S * (0.42 + 0.3 * lo + 0.3 * fog);
      ctx.globalAlpha = clamp((0.5 + 0.25 * lo) * br * (1 - 0.3 * clamp(cover - 0.5, 0, 1)), 0, 1);
      ctx.drawImage(aure, sx - A, sy - A, A * 2, A * 2);
      const C = r * (3.4 + 1.4 * lo + 2.4 * dif);
      ctx.globalAlpha = clamp((0.72 - 0.4 * lo) * br, 0, 1);
      ctx.drawImage(corona, sx - C, sy - C, C * 2, C * 2);
      ctx.restore();
      const R = discR * r / (S * 0.05);
      ctx.globalAlpha = clamp(br * (1 - 0.6 * dif), 0, 1); ctx.drawImage(disc, sx - R, sy - R, R * 2, R * 2);
      ctx.globalAlpha = 1;
    } else {
      ctx.save(); ctx.globalCompositeOperation = "screen";
      const B = S * (0.2 + 0.12 * lo + 0.2 * fog);
      ctx.globalAlpha = clamp((0.32 + 0.18 * lo) * br * (1 - 0.55 * veil), 0, 1);
      ctx.drawImage(aure, sx - B, sy - B, B * 2, B * 2);
      const ra = 0.1 * br * (1 - 0.8 * veil) * (1 - fog) * (1 - 0.5 * cover) * (0.6 + 0.4 * (1 - lo));
      if (ra > 0.004) {
        const Rr = S * (0.3 + 0.08 * lo);
        ctx.translate(sx, sy);
        ctx.rotate(t * 0.012); ctx.globalAlpha = ra; ctx.drawImage(rays, -Rr, -Rr, Rr * 2, Rr * 2);
        ctx.rotate(-t * 0.031 + 1.3); ctx.globalAlpha = ra * 0.6; ctx.drawImage(rays, -Rr * 0.8, -Rr * 0.8, Rr * 1.6, Rr * 1.6);
      }
      ctx.restore();
    }
  }

  return { build, step, drawSky, drawStars, drawSun };
})();
