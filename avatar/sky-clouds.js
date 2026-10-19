const Clouds = (() => {
  const { TAU, clamp, smooth, rng, parse, P } = Core;
  const NS = 256, DOME = 0.25, BUDGET = 300000;
  const LAYER = [{ sp: 0.006, hz: 0.4 }, { sp: 0.009, hz: 0.28 }, { sp: 0.014, hz: 0.12 }, { sp: 0.024, hz: 0.03 }, { sp: 0.05, hz: 0 }];
  const GEN = {
    cu: { kind: 0, k: 1.5, th: 0.3, sw: 0.24, gk: 0.62, amb: 0.3, kd: 0.78, wr: 0.55, kc: 0.22, tk: 1.4, kt: 0.16, kb: 0.4, bo: 0.05, al: 1 },
    cb: { kind: 0, k: 1, th: 0.28, sw: 0.32, gk: 0.7, amb: 0.24, kd: 0.52, wr: 0.4, kc: 0.38, tk: 1.2, kt: 0.12, kb: 0.55, bo: 0.06, al: 1 },
    fr: { kind: 0, k: 1.1, th: 0.34, sw: 0.36, gk: 0.4, amb: 0.3, kd: 0.34, wr: 0.5, kc: 0.24, tk: 1.6, kt: 0.1, kb: 0.2, bo: 0.08, al: 0.9 },
    sc: { kind: 4, k: 0.75, th: 0.2, sw: 0.34, gk: 0.5, amb: 0.38, kd: 0.5, wr: 0.6, kc: 0.3, tk: 1.4, kt: 0.2, kb: 0, bo: 0.05, al: 1 },
    ac: { kind: 2, k: 1.4, th: 0.22, sw: 0.3, gk: 0.6, amb: 0.42, kd: 0.62, wr: 0.6, kc: 0.06, tk: 2, kt: 0.2, kb: 0, bo: 0.04, al: 0.78 },
    ci: { kind: 3, k: 1.1, th: 0.05, sw: 0.4, gk: 0, amb: 0.85, kd: 0.25, wr: 1, kc: 0, tk: 1, kt: 0.1, kb: 0, bo: 0.02, al: 0.62 },
    ns: { kind: 4, k: 0.5, th: 0.14, sw: 0.45, gk: 0.3, amb: 0.3, kd: 0.3, wr: 0.6, kc: 0.4, tk: 1.1, kt: 0.1, kb: 0, bo: 0.05, al: 1 },
    mi: { kind: 5, k: 0.4, th: 0.1, sw: 0.6, gk: 0, amb: 0.72, kd: 0.1, wr: 1, kc: 0, tk: 1, kt: 0, kb: 0, bo: 0.06, al: 0.55 },
  };
  let N0, N1, NT, NC, list = [], jobs = [], seq = 0, rr = 0, wi = 0, spawnT = 0, drawT = -1e9, full = 1, R0 = 1, KS = 0.5, palT = -1e9, palK = "", fogC = null, fogK = "";
  let sc0 = new Float32Array(0), sc1 = new Float32Array(0), sc2 = new Float32Array(0), sc3 = new Float32Array(0);
  const C = {}, sun = [0, 0];

  const F = (v, d) => (v === undefined || v === null ? d : v);
  const cover = () => clamp(F(G.T.cover, 0.4), 0, 1);
  const dark = () => clamp(F(G.T.dark, G.T.sun ? 0 : 1), 0, 1);
  const elev = () => clamp(F(G.T.sunElev, 0.7), 0, 1);
  const lowSun = () => 1 - smooth(clamp(elev() / 0.34, 0, 1));
  const wt = (k) => clamp(F(G.T[k], 0), 0, 1);
  const hh = (i, j) => { let k = (Math.imul(i, 374761393) + Math.imul(j, 668265263)) | 0; k = Math.imul(k ^ (k >>> 13), 1274126177); return ((k ^ (k >>> 16)) >>> 0) / 4294967296; };
  const lum = (c) => (c[0] * 0.299 + c[1] * 0.587 + c[2] * 0.114) / 255;
  const lerp3 = (a, b, t, o) => { o[0] = a[0] + (b[0] - a[0]) * t; o[1] = a[1] + (b[1] - a[1]) * t; o[2] = a[2] + (b[2] - a[2]) * t; return o; };

  /* SPRITES */

  function noiseTex(seed, oct) {
    const n = NS, A = new Float32Array(n * n), B = new Float32Array(n * n), rnd = rng(seed);
    for (let o = 0, c = 4, amp = 1; o < oct; o++, c *= 2, amp *= 0.5) {
      const gx = new Float32Array(c * c), gy = new Float32Array(c * c), s = c / n;
      for (let i = 0; i < c * c; i++) { const a = rnd() * TAU; gx[i] = Math.cos(a); gy[i] = Math.sin(a); }
      for (let y = 0; y < n; y++) {
        const fy = y * s, iy = fy | 0, ty = fy - iy, vy = ty * ty * ty * (ty * (ty * 6 - 15) + 10), r0 = (iy % c) * c, r1 = ((iy + 1) % c) * c;
        for (let x = 0; x < n; x++) {
          const fx = x * s, ix = fx | 0, tx = fx - ix, vx = tx * tx * tx * (tx * (tx * 6 - 15) + 10), c0 = ix % c, c1 = (ix + 1) % c;
          const a = gx[r0 + c0] * tx + gy[r0 + c0] * ty, b = gx[r0 + c1] * (tx - 1) + gy[r0 + c1] * ty;
          const e = gx[r1 + c0] * tx + gy[r1 + c0] * (ty - 1), f = gx[r1 + c1] * (tx - 1) + gy[r1 + c1] * (ty - 1);
          const ab = a + (b - a) * vx, v = ab + (e + (f - e) * vx - ab) * vy, j = y * n + x;
          A[j] += v * amp; B[j] += Math.abs(v) * amp;
        }
      }
    }
    let a0 = 1e9, a1 = -1e9, b0 = 1e9, b1 = -1e9;
    for (let j = 0; j < n * n; j++) { a0 = Math.min(a0, A[j]); a1 = Math.max(a1, A[j]); b0 = Math.min(b0, B[j]); b1 = Math.max(b1, B[j]); }
    for (let j = 0; j < n * n; j++) { A[j] = ((A[j] - a0) / (a1 - a0)) * 2 - 1; B[j] = (B[j] - b0) / (b1 - b0); }
    return [A, B];
  }

  function ns(N, x, y) {
    const fx = Math.floor(x), fy = Math.floor(y);
    let tx = x - fx, ty = y - fy;
    tx = tx * tx * (3 - 2 * tx); ty = ty * ty * (3 - 2 * ty);
    const x0 = fx & 255, x1 = (fx + 1) & 255, y0 = (fy & 255) << 8, y1 = ((fy + 1) & 255) << 8;
    const a = N[y0 | x0], b = N[y0 | x1], c = N[y1 | x0], d = N[y1 | x1];
    return a + (b - a) * tx + (c - a + (a - b - c + d) * tx) * ty;
  }

  function bil(A, w, h, x, y) {
    if (x < 0) x = 0; else if (x > w - 1.001) x = w - 1.001;
    if (y < 0) y = 0; else if (y > h - 1.001) y = h - 1.001;
    const ix = x | 0, iy = y | 0, tx = x - ix, ty = y - iy, i = iy * w + ix;
    const a = A[i], b = A[i + 1], c = A[i + w], d = A[i + w + 1];
    return a + (b - a) * tx + (c - a + (a - b - c + d) * tx) * ty;
  }

  function alloc(c) {
    const n = c.cw * c.ch;
    c.D = new Float32Array(n); c.H = new Float32Array(n); c.P = new Float32Array(n); c.E = new Uint8Array(n);
    c.can = document.createElement("canvas"); c.can.width = c.cw; c.can.height = c.ch;
    c.cx = c.can.getContext("2d"); c.img = c.cx.createImageData(c.cw, c.ch); c.u32 = new Uint32Array(c.img.data.buffer);
    c.Q = new Float32Array(56);
  }

  function planHeap(c, rnd) {
    const w = c.cw, h = c.ch, roll = c.kind === 1, big = clamp(c.ew / G.S, 0, 1.2), fl = c.flat, B = [];
    if (roll) {
      const lines = 2 + Math.floor(rnd() * 2);
      for (let k = 0; k < lines; k++) {
        const n = 4 + Math.floor(rnd() * 3), off = (k - (lines - 1) / 2) * 0.42;
        for (let i = 0; i < n; i++) { const t = (i / (n - 1)) * 2 - 1, r = (0.15 + 0.08 * (1 - t * t)) * (0.8 + 0.4 * rnd()); B.push(t * 0.8 + (rnd() - 0.5) * 0.12, off + (rnd() - 0.5) * 0.1, r, 0, r * 0.3 * rnd()); }
      }
    } else {
      const sp = c.sp, ring = fl < 0.3;
      const Rx = 0.75, Ry = Rx * (ring ? 0.62 : sp === 0 ? 0.42 : 0.66) * (0.85 + 0.3 * rnd()), lean = (c.wdx > 0 ? 1 : -1) * (0.1 + 0.25 * rnd());
      const cy = ring ? 0 : -Ry * 0.42, m = Math.min(Rx, Ry);
      B.push(0, cy, m * 0.75, 0, 0, -Rx * 0.45, cy + Ry * 0.12, m * 0.55, 0, 0, Rx * 0.45, cy + Ry * 0.12, m * 0.55, 0, 0);
      const nc = (ring ? 8 : 5) + Math.floor(rnd() * 4), a0 = ring ? 0 : Math.PI, a1 = ring ? TAU : 0, ph = rnd();
      for (let k = 0; k < nc; k++) {
        const th = a0 + (a1 - a0) * ((k + 0.5 + (rnd() - 0.5) * 0.6) / nc), up = ring ? 0.75 + 0.25 * Math.sin(th + ph * 6) : Math.sin(th);
        const x = Math.cos(th) * Rx * 0.82, y = ring ? cy - Math.sin(th) * Ry * 0.8 : cy + Ry * 0.42 - Math.sin(th) * Ry * 0.86;
        const r = (ring ? 0.2 : 0.14 + 0.16 * up) * (Ry / 0.6) * (0.75 + 0.5 * rnd()) + 0.05, rr = Math.min(r, m * 0.7);
        B.push(x, y, rr, 0, rr * (0.15 + 0.35 * rnd()));
      }
      if (sp === 2 && !ring) {
        let px = (rnd() - 0.5) * Rx * 0.4, py = cy - Ry * 0.75, pr = m * (c.g === "cb" ? 0.8 : 0.66);
        for (let i = 0, nt = (c.g === "cb" ? 3 : 2) + Math.floor(rnd() * 2); i < nt; i++) {
          B.push(px, py, pr, 0, pr * 0.35);
          if (i === nt - 1) for (const sd of [-1, 1]) B.push(px + sd * pr * (0.75 + 0.2 * rnd()), py + pr * (0.25 + 0.2 * rnd()), pr * (0.55 + 0.15 * rnd()), 0, pr * 0.3);
          px += lean * pr * 0.45; py -= pr * (0.8 + 0.15 * rnd()); pr *= 0.88 + 0.1 * rnd();
        }
      }
    }
    const n0 = B.length, cx0 = 0, cy0 = -0.3 * fl;
    for (let j = 0; j < n0; j += 5) {
      if (j < 15 && !roll) continue;
      const out = Math.atan2(B[j + 1] - cy0, B[j] - cx0), m = roll ? 2 + Math.floor(rnd() * 2) : 2 + Math.floor(rnd() * 3), pr = B[j + 2], pz = B[j + 4];
      for (let q = 0; q < m; q++) {
        const a = roll ? -Math.PI * (0.1 + 0.8 * rnd()) : out + (rnd() - 0.5) * 2.4, r1 = pr * (0.3 + 0.24 * rnd()), dd = pr * (0.8 + 0.16 * rnd()) - r1 * 0.3;
        const x = B[j] + Math.cos(a) * dd, y = B[j + 1] + Math.sin(a) * dd, z1 = pz + pr * Math.sqrt(Math.max(0, 1 - (dd / pr) * (dd / pr))) * 0.7;
        if (fl > 0.3 && y + r1 * 0.4 > 0) continue;
        B.push(x, y, r1, 1, z1);
        for (let k = 0, mk = Math.floor(rnd() * 2.2); k < mk; k++) {
          const b = a + (rnd() - 0.5) * 2.2, r2 = r1 * (0.34 + 0.22 * rnd()), d2 = r1 * (0.82 + 0.14 * rnd()) - r2 * 0.25, x2 = x + Math.cos(b) * d2, y2 = y + Math.sin(b) * d2;
          if (fl > 0.3 && y2 + r2 * 0.4 > 0) continue;
          B.push(x2, y2, r2, 2, z1 + r1 * Math.sqrt(Math.max(0, 1 - (d2 / r1) * (d2 / r1))) * 0.55);
        }
      }
    }
    let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
    for (let j = 0; j < B.length; j += 5) { x0 = Math.min(x0, B[j] - B[j + 2]); x1 = Math.max(x1, B[j] + B[j + 2]); y0 = Math.min(y0, B[j + 1] - B[j + 2]); y1 = Math.max(y1, B[j + 1] + B[j + 2]); }
    if (fl > 0.3) y1 = Math.min(y1, 0.02) + 0.08 * fl;
    const m = 0.08, s = Math.min((w * (1 - 2 * m)) / (x1 - x0 + 0.16), (h * (1 - 2 * m)) / (y1 - y0 + 0.16)), mx = (x0 + x1) / 2, my = (y0 + y1) / 2, n = w * h;
    if (sc0.length < n) { sc0 = new Float32Array(n); sc1 = new Float32Array(n); }
    if (sc2.length < n) { sc2 = new Float32Array(n); sc3 = new Float32Array(n); }
    sc0.fill(1e6, 0, n); sc1.fill(0, 0, n);
    const wf = 26 / (s * 1.8), wq = s * 0.05, wf2 = wf * 3.2, wq2 = s * 0.018, o1 = rnd() * 256, o2 = rnd() * 256;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const i = y * w + x; sc2[i] = x + ns(N0, x * wf + o1, y * wf + o2) * wq + ns(N1, x * wf2 + o2, y * wf2 + o1) * wq2; sc3[i] = y + ns(N1, x * wf + o2, y * wf + o1) * wq + ns(N0, x * wf2 + o1, y * wf2 + o2) * wq2; }
    for (let j = 0; j < B.length; j += 5) {
      const lv = B[j + 3], X = w / 2 + (B[j] - mx) * s, Y = h / 2 + (B[j + 1] - my) * s, r = B[j + 2] * s, Z = B[j + 4] * s, k = r * (lv === 2 ? 0.3 : lv ? 0.22 : 0.3), R = r + k + wq + wq2, kh = r * 0.4, ih = 1 / (4 * kh);
      const xa = Math.max(0, Math.floor(X - R)), xb = Math.min(w - 1, Math.ceil(X + R)), ya = Math.max(0, Math.floor(Y - R)), yb = Math.min(h - 1, Math.ceil(Y + R)), ik = 1 / (4 * k), ir = 1 / (r * r);
      for (let y = ya; y <= yb; y++) {
        const row = y * w;
        for (let x = xa; x <= xb; x++) {
          const i = row + x, dx = sc2[i] - X, ey = sc3[i] - Y, q = dx * dx + ey * ey, e = Math.sqrt(q) - r, o = sc0[i], hk = k - Math.abs(o - e);
          sc0[i] = (o < e ? o : e) - (hk > 0 ? hk * hk * ik : 0);
          const u = 1 - q * ir;
          if (u > 0) { const hv = Z + r * (1.7 * Math.sqrt(u) - 0.7), ho = sc1[i], hq = kh - Math.abs(ho - hv); sc1[i] = (ho > hv ? ho : hv) + (hq > 0 ? hq * hq * ih : 0); }
        }
      }
    }
    c.ps = s; c.pmx = mx; c.pmy = my; c.pay = (y1 - y0) / 2;
    c.rag = c.g === "fr" ? 1.6 : c.g === "cb" ? 1.2 : roll ? 0.8 : 1; c.trail = c.g === "fr" ? 0.1 : 0.04; c.warp = 0.03; c.pr = 0.03; c.ph = 1; c.swc = (1.3 * 8) / s;
  }

  function plan(c) {
    const rnd = rng(c.seed), w = c.cw, wm = Math.hypot(G.wind.x, G.wind.y) || 1;
    c.ox = rnd() * 256; c.oy = rnd() * 256; c.q = 64 / w; c.wdx = G.wind.x / wm; c.wdy = G.wind.y / wm;
    const rel = clamp((c.sy - G.H / 2) / (G.H / 2), -1, 1), heapy = c.kind <= 1;
    c.upx = 0; c.upy = -1;
    c.ang = Math.atan2(c.wdy, c.wdx) + (rnd() - 0.5) * 0.5 + (c.kind === 2 ? Math.PI / 2 : 0);
    c.flat = heapy ? (c.g === "fr" ? 0.25 : c.kind === 1 ? 0.45 : clamp(0.78 + 0.18 * rel, 0.6, 0.95)) : 0;
    c.fc = 10 + rnd() * 6; c.fs = 1.1 + rnd() * 0.5;
    c.band = 0.4 + 0.35 * (1 - Math.abs(rel));
    if (heapy) planHeap(c, rnd);
    c.hook = (rnd() - 0.5) * 1.2; c.dmax = 1;
    if (c.kind >= 4) {
      const g = c.g;
      c.ls = g === "sc" ? 2.6 + rnd() * 1.4 : g === "mi" ? 1.4 + rnd() * 0.6 : 1.8 + rnd() * 0.8; c.la = g === "sc" ? 1.1 : g === "mi" ? 0.7 : 0.75; c.ho = g === "sc" ? 0.1 + rnd() * 0.12 : g === "mi" ? 0.06 : 0.02 * rnd();
      c.pr = g === "mi" ? 0.03 : 0.022; c.ph = g === "mi" ? 0 : 3; c.dd = g === "ns" ? 0.22 : g === "sc" ? 0.04 : 0; c.hb = g === "mi" ? 0 : g === "ns" ? 0.05 : 0.03;
    }
    if (c.kind === 3) {
      const n = 7 + Math.floor(rnd() * 8), ar = c.ch / c.cw, hk = (rnd() - 0.4) * 0.9;
      c.fib = [];
      for (let k = 0; k < n; k++) { const a0 = -0.95 + rnd() * 0.6, a1 = Math.min(0.98, a0 + 0.7 + rnd() * 0.9); c.fib.push(a0, a1, (rnd() - 0.5) * ar * 1.3, ar * (0.035 + 0.06 * rnd()), hk + (rnd() - 0.5) * 0.5, 0.45 + 0.55 * rnd()); }
    }
    c.gy = 0;
  }

  function rowsHeap(c, y0, y1) {
    const w = c.cw, h = c.ch, D = c.D, H = c.H, E = c.E, A = sc0, M = sc1, s = c.ps, is = 1 / s, mx = c.pmx, my = c.pmy, ay = c.pay;
    const ox = c.ox, oy = c.oy, wa = c.warp * s, rag = c.rag, tr = c.trail, wdx = c.wdx, wdy = c.wdy, fl = c.flat, bd = F(c.band, 0.4);
    for (let y = y0; y < y1; y++) for (let x = 0; x < w; x++) {
      const i = y * w + x;
      if (x < 1 || y < 1 || x >= w - 1 || y >= h - 1) { D[i] = 0; H[i] = 0; E[i] = 0; continue; }
      const U = (x - w / 2) * is + mx, V = (y - h / 2) * is + my, n1 = ns(N0, U * 70 + ox, V * 70 + oy), n2 = ns(N1, U * 70 + oy, V * 70 + ox);
      const px = x + n1 * wa, py = y + n2 * wa;
      let d = -bil(A, w, h, px, py) * is;
      if (d < -0.3) { D[i] = 0; H[i] = 0; E[i] = 0; continue; }
      let base = 0;
      if (fl > 0) {
        const cut = (-V + n1 * 0.045 + n2 * 0.02 + 0.01) * 0.14, hk = 0.012 - Math.abs(d - cut), lo = (d < cut ? d : cut) - (hk > 0 ? (hk * hk) / 0.048 : 0);
        d += (lo - d) * fl;
        const bv = clamp((V + n2 * 0.05 - M[i] * is * 0.45 + ay * bd) / (ay * bd), 0, 1);
        base = bv * bv * (3 - 2 * bv) * fl;
      }
      const crown = clamp(0.5 - V / (ay * 2), 0, 1), ed = d <= 0 ? 1 : d >= 0.08 ? 0 : 1 - d / 0.08;
      const t1 = ns(NT, U * 110 + ox, V * 110 + oy), t2 = ns(NT, U * 260 + oy, V * 260 + ox), fa = U * wdx + V * wdy, fc = V * wdx - U * wdy, fb = ns(N1, fa * 150 + oy, fc * 640 + ox);
      const dw = clamp(fa * 2 + 0.3, 0, 1) * tr * 25;
      d += ((t1 - 0.36) * 0.05 + (t2 - 0.36) * 0.022) * rag * (0.4 + 0.6 * crown) * (1 - 0.5 * base) * (0.25 + 0.75 * ed) + fb * (0.01 + 0.02 * dw) * ed * (0.5 + base);
      D[i] = 0.3 + d * 8;
      H[i] = M[i];
      E[i] = base * 255;
    }
  }

  function rowsCells(c, y0, y1) {
    const w = c.cw, h = c.ch, D = c.D, H = c.H, E = c.E, hw = w / 2, iw = 2 / w, ar = h / w, ca = Math.cos(c.ang), sa = Math.sin(c.ang), fc = c.fc, fs = c.fs, q = c.q, ox = c.ox, oy = c.oy, hc = (w / 2 / fc) * 0.45;
    for (let y = y0; y < y1; y++) for (let x = 0; x < w; x++) {
      const i = y * w + x;
      E[i] = 0;
      if (x < 1 || y < 1 || x >= w - 1 || y >= h - 1) { D[i] = 0; H[i] = 0; continue; }
      const u = (x - hw) * iw, v = (y - h / 2) * iw, n1 = ns(N0, x * q * 1.6 + ox, y * q * 1.6 + oy), n2 = ns(N1, x * q * 1.6 + oy, y * q * 1.6 + ox);
      let env = 1 - (u * u + (v * v) / (ar * ar)) * 1.15 + n1 * 1.05 + n2 * 0.45;
      if (env <= 0) { D[i] = 0; H[i] = 0; continue; }
      env = env > 0.9 ? 1 : env / 0.9;
      const n3 = ns(N1, x * q * 6 + oy, y * q * 6 + ox), A = (u * ca + v * sa) * fc + n1 * 0.45 + n3 * 0.1, Bc = (-u * sa + v * ca) * (fc / fs) + n2 * 0.45, ia = Math.floor(A);
      let sum = 0;
      for (let k = -1; k <= 1; k++) {
        const ra = ia + k, bb = Bc + hh(ra, 91) * 3.7, ib = Math.floor(bb);
        for (let j = -1; j <= 1; j++) {
          const cb = ib + j, hr = hh(ra + 29, cb + 57);
          if (hr < 0.14) continue;
          const jx = ra + 0.5 + 0.3 * (hh(ra, cb) - 0.5) - A, jy = cb + 0.5 + 0.35 * (hh(ra + 71, cb + 13) - 0.5) - bb, rr = (0.52 + 0.3 * hr) * (0.5 + 0.5 * env), r2 = rr * rr;
          const q2 = (jx * jx) / (r2 * 0.8) + (jy * jy) / (r2 * 1.35);
          if (q2 < 1) { const e = 1 - q2; sum += e * e * (0.6 + 0.5 * hr); }
        }
      }
      const cell = clamp(sum, 0, 1.2);
      D[i] = env * cell * (0.85 + 0.15 * n3);
      H[i] = Math.sqrt(cell) * hc;
    }
  }

  function rowsFibers(c, y0, y1) {
    const w = c.cw, h = c.ch, D = c.D, H = c.H, E = c.E, hw = w / 2, iw = 2 / w, ca = Math.cos(c.ang), sa = Math.sin(c.ang), q = c.q, ox = c.ox, oy = c.oy, Fb = c.fib, nf = Fb.length;
    for (let y = y0; y < y1; y++) for (let x = 0; x < w; x++) {
      const i = y * w + x;
      E[i] = 0; H[i] = 0;
      if (x < 1 || y < 1 || x >= w - 1 || y >= h - 1) { D[i] = 0; continue; }
      const u = (x - hw) * iw, v = (y - h / 2) * iw, a = u * ca + v * sa, b = -u * sa + v * ca, n1 = ns(N0, x * q * 1.4 + ox, y * q * 1.4 + oy);
      let d = 0;
      for (let k = 0; k < nf; k += 6) {
        const a0 = Fb[k], a1 = Fb[k + 1];
        if (a < a0 - 0.04 || a > a1) continue;
        const s = (a - a0) / (a1 - a0), wd = Fb[k + 3] * (0.35 + 1.2 * s), t = b - Fb[k + 2] - Fb[k + 4] * (a - a0) * (a - a0) * 0.35 - n1 * 0.035, qq = (t / wd) * (t / wd);
        if (qq >= 4) continue;
        const e = 1 - qq * 0.25, ac = e * e * e, sh = s < 0 ? 0 : s < 0.14 ? smooth(s / 0.14) : 1, al = sh * Math.pow(1 - s, 1.1) * (1 + 0.6 * Math.exp(-s * 5));
        const f = 0.4 + 0.6 * ns(N1, a * 14 + k * 7, (t / wd) * 13 + k * 13) + 0.35 * ns(N0, a * 40 + k * 3, (t / wd) * 34);
        const val = Fb[k + 5] * al * (ac * clamp(f, 0, 1.2) * 0.85 + e * e * 0.18);
        if (val > d) d = val;
      }
      D[i] = d;
    }
  }

  function rowsDeck(c, y0, y1) {
    const w = c.cw, h = c.ch, D = c.D, H = c.H, E = c.E, hw = w / 2, iw = 2 / w, ar = h / w, ox = c.ox, oy = c.oy, mist = c.kind === 5, ca = Math.cos(c.ang), sa = Math.sin(c.ang);
    const ls = c.ls * 64, la = c.la, ho = c.ho, sx = mist ? 0.45 : 1, sy = mist ? 1.8 : 1, dd = c.dd, hb = c.hb * w;
    for (let y = y0; y < y1; y++) for (let x = 0; x < w; x++) {
      const i = y * w + x;
      E[i] = 0; H[i] = 0;
      if (x < 1 || y < 1 || x >= w - 1 || y >= h - 1) { D[i] = 0; continue; }
      const u = (x - hw) * iw, v = (y - h / 2) * iw, A = (u * ca + v * sa) * sx, B = (-u * sa + v * ca) * sy;

      const n1 = ns(N0, A * 60 + ox, B * 60 + oy), n2 = ns(N1, A * 150 + oy, B * 150 + ox), wu = u + n1 * 0.22, wv = v + n2 * 0.22 * ar;
      const r2 = (wu * wu) / 0.62 + (wv * wv) / (ar * ar * 0.62), env = clamp((1 - r2) / 0.4, 0, 1);
      if (env <= 0) { D[i] = 0; continue; }
      const L = ns(NT, A * ls + ox, B * ls + oy), f = ns(N0, A * ls * 2.3 + oy, B * ls * 2.3 + ox), e2 = 1 - env;
      D[i] = Math.max(0, 0.34 + la * (L - 0.25) + 0.18 * f + 0.1 * n2 - ho - e2 * e2 * 0.9 - e2 * 0.1 + dd * env);
      H[i] = hb * (L + 0.3 * f);
    }
  }

  function box(src, dst, w, h, r, dx) {
    const k = 1 / (2 * r + 1), n = dx ? w : h, m = dx ? h : w, st = dx ? 1 : w, ln = dx ? w : 1;
    for (let j = 0; j < m; j++) {
      const o = j * ln;
      let acc = 0;
      for (let t = -r; t <= r; t++) acc += src[o + (t < 0 ? 0 : t > n - 1 ? n - 1 : t) * st];
      for (let t = 0; t < n; t++) {
        dst[o + t * st] = acc * k;
        const a = t + r + 1, b = t - r;
        acc += src[o + (a > n - 1 ? n - 1 : a) * st] - src[o + (b < 0 ? 0 : b) * st];
      }
    }
  }

  function pillow(c) {
    const w = c.cw, h = c.ch, n = w * h, D = c.D, H = c.H, P = c.P, th = c.d.th, raw = c.kind >= 4, r = Math.max(1, Math.round(Math.min(w, h) * c.pr)), hp = r * c.ph, R = Math.max(2, Math.round(Math.min(w, h) * 0.09));
    if (sc0.length < n) { sc0 = new Float32Array(n); sc1 = new Float32Array(n); }
    for (let i = 0; i < n; i++) { const a = raw ? D[i] - th : (D[i] - th) * 4; sc0[i] = a < 0 ? 0 : a > 1 ? 1 : a; }
    P.set(sc0.subarray(0, n));
    box(sc0, sc1, w, h, r, 1); box(sc1, sc0, w, h, r, 0); box(sc0, sc1, w, h, r, 1); box(sc1, sc0, w, h, r, 0);
    for (let i = 0; i < n; i++) H[i] += hp * sc0[i];
    box(P, sc1, w, h, R, 1); box(sc1, sc0, w, h, R, 0); box(sc0, sc1, w, h, R, 1); box(sc1, P, w, h, R, 0);
    const k = R * 2.6;
    for (let i = 0; i < n; i++) P[i] *= k;
  }

  function gen(c, budget) {
    if (!c.D) alloc(c);
    if (c.gy === 0) plan(c);
    const w = c.cw, rows = Math.max(1, Math.floor(budget / w)), y0 = c.gy, y1 = Math.min(c.ch, y0 + rows);
    if (c.kind <= 1) rowsHeap(c, y0, y1); else if (c.kind === 2) rowsCells(c, y0, y1); else if (c.kind === 3) rowsFibers(c, y0, y1); else rowsDeck(c, y0, y1);
    c.gy = y1;
    if (c.gy >= c.ch) {
      if (c.kind <= 1) { const n = c.cw * c.ch; if (sc1.length < n) sc1 = new Float32Array(n); box(c.H, sc1, c.cw, c.ch, 1, 1); box(sc1, c.H, c.cw, c.ch, 1, 0); }
      if (c.pr) pillow(c);
      c.ready = 1; c.sy0 = 0; c.st = -1e9;
    }
    return (y1 - y0) * w * (c.gy >= c.ch && c.pr ? 2 : 1);
  }

  /* FIELD */

  function palette() {
    const T = G.T;
    if (T.key === palK && G.t - palT < 0.25) return;
    palK = T.key; palT = G.t;
    for (const f of ["zenith", "mid", "rim", "body", "shade", "light"]) C[f] = parse(T[f]);
    C.warm = parse(F(T.warm, T.light));
    C.white = parse(P.white);
    C.navy = parse(P.indigo).map((v) => v * 0.28);
    C.night = parse(P.indigo).map((v) => v * 0.45);
  }

  const tmp0 = [0, 0, 0], tmp1 = [0, 0, 0], tmp2 = [0, 0, 0], skyC = [0, 0, 0];

  function skyAt(rn, o) {
    const d = dark(), z = lerp3(lerp3(C.zenith, C.mid, 0.45, tmp0), C.navy, 0.35 * d, tmp0), m = lerp3(C.mid, C.navy, 0.4 * d, tmp1), r = lerp3(C.rim, C.night, 0.4 * d, tmp2);
    if (rn < 0.45) return lerp3(z, m, rn / 0.45, o);
    return lerp3(m, r, (rn - 0.45) / 0.55, o);
  }

  function setup(c) {
    palette();
    const T = G.T, d = c.d, Q = c.Q, W = G.W, H = G.H, e = elev(), lo = lowSun(), dk = dark(), st = wt("storm"), night = !T.sun;
    const dx = sun[0] - c.sx, dy = sun[1] - c.sy, dist = Math.hypot(dx, dy) || 1, dn = dist / R0, rn = clamp(Math.hypot(c.sx - W / 2, c.sy - H / 2) / R0, 0, 1);
    const lz = clamp(-0.3 + 0.8 * smooth(clamp((dn - 0.05) / 1.1, 0, 1)) - 0.25 * e * (1 - rn), -0.6, 0.6), hl = Math.sqrt(1 - lz * lz);
    const back = 1 - smooth(clamp((dn - 0.04) / 0.5, 0, 1)), mi = night ? 1 - Math.abs(2 * F(T.moon, 0.5) - 1) : 1, lit = night ? 0.25 + 0.6 * mi : 1;
    const boil = d.bo * (c.life < 1 ? 1.6 : 1), th = d.th + 0.02 * Math.sin(G.t * 0.07 + c.seed) + (1 - smooth(c.life)) * (c.dmax - d.th + 0.08), sw = F(c.swc, d.sw) * (1 + (1 - smooth(c.life)) * 1.2);
    const det = c.ja * c.jd - c.jb * c.jb || 1, kx = c.cw / c.ew, ky = c.ch / c.eh;
    const ox = (c.jd * dx - c.jb * dy) / det, oy = (-c.jb * dx + c.ja * dy) / det;
    const ku = c.kind <= 1 ? (0.15 + 0.5 * c.flat) * (night ? 0.5 : 1) : 0;
    let ux = (dx / dist) * (1 - ku), uy = (dy / dist) * (1 - ku) - ku;
    const um = Math.hypot(ux, uy) || 1;
    const nk = smooth((dk - 0.55) / 0.4);
    Q[0] = th; Q[1] = 1 / sw; Q[2] = d.gk * (1 - 0.6 * nk); Q[3] = (ux / um) * hl; Q[4] = (uy / um) * hl; Q[5] = lz; Q[6] = d.wr; Q[7] = 1 / (1 + d.wr);
    Q[8] = d.amb * (night ? 0.6 + 0.4 * mi : 1); Q[9] = d.kd * lit * (1 - 0.55 * st); Q[10] = d.kc * (1 - 0.8 * F(c.flat, 0)) * (0.4 + 0.6 * back); Q[11] = d.tk; Q[12] = d.kt * (0.6 + 0.8 * back);
    Q[13] = (0.7 + 0.5 * lo) * back * lit * (1 - 0.75 * st); Q[14] = c.cw / 2 + ox * kx; Q[15] = c.ch / 2 + oy * ky; const sg = G.S * 0.22 * kx; Q[16] = sg * sg;
    Q[17] = boil; Q[18] = Math.cos(G.t * 0.16 + c.seed); Q[19] = Math.sin(G.t * 0.16 + c.seed); Q[20] = c.q * 5;
    Q[21] = d.kb * (1 - lo); Q[22] = 0.42 * lo * (1 - 0.7 * st) * lit;
    const hz = clamp(LAYER[c.L].hz * (0.7 + 0.6 * F(T.haze, 0.5)) + 0.22 * rn * rn + 0.35 * wt("fog") * (c.g === "mi" ? 0 : 1), 0, 0.85);
    skyAt(rn, skyC);
    const sh = lerp3(C.shade, skyC, 0.12, [0, 0, 0]), sl = lum(sh) * 255, liC = lerp3(C.light, C.warm, 0.45 * lo, [0, 0, 0]);
    for (let j = 0; j < 3; j++) sh[j] += (sl - sh[j]) * 0.28;
    const floor = (lum(skyC) - 0.06) * (1 - dk) * (1 - st) * (1 - smooth((cover() - 0.55) / 0.35)), bl = lum(C.body), l0 = lum(sh);
    if (l0 < floor && bl > l0) lerp3(sh, C.body, Math.min(1, (floor - l0) / (bl - l0)), sh);
    const bd = C.body, li = liC, rimC = lerp3(C.light, C.white, night ? 0.25 : 0.45, [0, 0, 0]), wm = C.warm;
    const cols = [sh, bd, li, rimC, wm];
    for (let k = 0; k < 5; k++) for (let j = 0; j < 3; j++) Q[24 + k * 3 + j] = cols[k][j] + (skyC[j] - cols[k][j]) * hz;
    Q[48] = c.kind <= 1 ? 0.78 : c.kind === 2 ? 0.4 : 0; Q[49] = c.kind <= 1 ? 0.85 : c.kind === 4 ? 0.6 : 0;
    Q[39] = d.al; Q[40] = c.kind === 3 || c.kind === 5 ? 0 : 0.03; Q[41] = 1.1; Q[42] = (c.kind <= 1 ? 0.3 : c.kind === 2 ? 0.4 : c.kind === 4 ? 0.15 : 0) * (1 - nk);
    const sp = Math.max(1.5, Math.min(c.cw, c.ch) * 0.035), lm = Math.hypot(Q[3], Q[4]) || 1;
    Q[43] = c.kind <= 1 ? 0.14 * lit * (1 - 0.5 * st) * (1 - 0.8 * nk) * clamp(c.cw / 300, 0.3, 1) : 0; Q[44] = (Q[3] / lm) * sp; Q[45] = (Q[4] / lm) * sp; Q[46] = sp * Math.max(0.2, lz + 0.4); Q[47] = Math.max(2, c.ch * 0.09);
  }

  function shade(c, y0, y1) {
    if (y0 === 0) setup(c);
    const Q = c.Q, w = c.cw, n = w * c.ch, D = c.D, H = c.H, P = c.P, E = c.E, out = c.u32, mw = Q[49], ss = Q[43], sdx = Q[44], sdy = Q[45], slp = Q[46], sh0 = Q[47];
    const th = Q[0], iw = Q[1], gk = Q[2], lx = Q[3], ly = Q[4], lz = Q[5], wr = Q[6], iwr = Q[7], amb = Q[8], kd = Q[9], kc = Q[10], tk = Q[11], kt = Q[12];
    const rim = Q[13], sx = Q[14], sy = Q[15], s2 = Q[16], bo = Q[17], bc = Q[18], bs = Q[19], bq = Q[20], kb = Q[21], kw = Q[22], al = Q[39] * 255, gr = Q[40], gq = Q[41], po = Q[42], ek = Q[48];
    const r0 = Q[24], g0 = Q[25], b0 = Q[26], r1 = Q[27], g1 = Q[28], b1 = Q[29], r2 = Q[30], g2 = Q[31], b2 = Q[32], r3 = Q[33], g3 = Q[34], b3 = Q[35], rw = Q[36], gw = Q[37], bw = Q[38];
    const lo = th - bo * 1.2, hi = th + bo * 2.5 + 1 / iw;
    for (let y = Math.max(1, y0); y < Math.min(c.ch - 1, y1); y++) {
      for (let x = 1; x < w - 1; x++) {
        const i = y * w + x;
        let d = D[i];
        if (d < lo) { out[i] = 0; continue; }
        if (bo > 0 && d < hi) d += bo * (ns(N0, x * bq + 17, y * bq) * bc + ns(N1, x * bq, y * bq + 29) * bs) * 1.4;
        if (d <= th) { out[i] = 0; continue; }
        const nx = (H[i - 1] - H[i + 1]) * gk, ny = (H[i - w] - H[i + w]) * gk, il = 1 / Math.sqrt(nx * nx + ny * ny + 1);
        let l = (nx * lx + ny * ly + lz) * il;
        l = l > -wr ? (l + wr) * iwr : 0;
        if (mw > 0) {
          const px = P[i - 1] - P[i + 1], py = P[i - w] - P[i + w], pl = 1 / Math.sqrt(px * px + py * py + 1);
          let lm = (px * lx + py * ly + lz) * pl;
          lm = lm > -wr ? (lm + wr) * iwr : 0;
          const lc = lm * (0.4 + 0.8 * l);
          l += ((lc > 1 ? 1 : lc) - l) * mw;
        }
        const eb = E[i] * 0.00392;
        let a = (d - th) * iw * (1 - ek + ek * l * l) * (1 - 0.25 * eb);
        a = a >= 1 ? 1 : a * a * (3 - 2 * a);
        let core = (d - th) * tk;
        if (core > 1) core = 1;
        const thin = (1 - core) * (1 - core);
        let v = amb + kd * l - kc * core + kt * thin - kb * eb;
        if (ss > 0) {
          const h0 = H[i];
          let m = 0;
          for (let k = 1; k <= 3; k++) { const j = i + ((sdx * k) | 0) + ((sdy * k) | 0) * w, e = H[j < 0 ? 0 : j >= n ? n - 1 : j] - h0 - k * slp; if (e > m) m = e; }
          const q = m > sh0 ? 1 : m / sh0;
          v -= ss * q * (2 - q);
        }
        if (rim > 0) { const dx = x - sx, dy = y - sy; v += rim * thin * s2 / (s2 + dx * dx + dy * dy); }
        if (po > 0) { const p = v * 3, fp = Math.floor(p), f = p - fp, k = f < 0.2 ? 0 : f > 0.8 ? 1 : (f - 0.2) * 1.667; v += ((fp + k * k * (3 - 2 * k)) / 3 - v) * po; }
        if (gr > 0) v += gr * ns(N1, x * gq + 53, y * gq + 11);
        let r, g, b;
        if (v < 0.5) { const t = v < 0 ? 0 : v * 2; r = r0 + (r1 - r0) * t; g = g0 + (g1 - g0) * t; b = b0 + (b1 - b0) * t; }
        else if (v < 1) { const t = (v - 0.5) * 2; r = r1 + (r2 - r1) * t; g = g1 + (g2 - g1) * t; b = b1 + (b2 - b1) * t; }
        else { const t = v > 1.5 ? 1 : (v - 1) * 2; r = r2 + (r3 - r2) * t; g = g2 + (g3 - g2) * t; b = b2 + (b3 - b2) * t; }
        if (kw > 0) { const t = kw * (l * 0.5 + eb * 0.9 + 0.1); r += (rw - r) * t; g += (gw - g) * t; b += (bw - b) * t; }
        out[i] = (((a * al) | 0) << 24) | ((b < 0 ? 0 : b > 255 ? 255 : b | 0) << 16) | ((g < 0 ? 0 : g > 255 ? 255 : g | 0) << 8) | (r < 0 ? 0 : r > 255 ? 255 : r | 0);
      }
    }
    if (y0 === 0) for (let x = 0; x < w; x++) out[x] = 0;
    if (y1 >= c.ch) for (let x = 0; x < w; x++) out[(c.ch - 1) * w + x] = 0;
    for (let y = Math.max(0, y0); y < Math.min(c.ch, y1); y++) { out[y * w] = 0; out[y * w + w - 1] = 0; }
    c.cx.putImageData(c.img, 0, 0, 0, y0, w, y1 - y0);
    return (y1 - y0) * w;
  }

  function place(c) {
    const W = G.W, H = G.H, r = Math.hypot(c.px, c.py), g = 1 / (1 + (DOME * r) / R0), ux = r > 1e-6 ? c.px / r : 1, uy = r > 1e-6 ? c.py / r : 0, k = g * (g - 1);
    c.sx = W / 2 + c.px * g; c.sy = H / 2 + c.py * g;
    c.ja = g + k * ux * ux; c.jb = k * ux * uy; c.jd = g + k * uy * uy;
    c.hx = (Math.abs(c.ja) * c.ew + Math.abs(c.jb) * c.eh) * 0.5; c.hy = (Math.abs(c.jb) * c.ew + Math.abs(c.jd) * c.eh) * 0.5;
    c.vis = c.sx + c.hx > -W * 0.08 && c.sx - c.hx < W * 1.08 && c.sy + c.hy > -H * 0.08 && c.sy - c.hy < H * 1.08 ? 1 : 0;
  }

  function toPlane(x, y) {
    const dx = x - G.W / 2, dy = y - G.H / 2, r = Math.hypot(dx, dy), g = 1 / Math.max(0.2, 1 - (DOME * r) / R0);
    return [dx * g, dy * g];
  }

  function make(g, rnd) {
    const S = G.S, d = GEN[g], u = rnd();
    const c = { id: seq++, g, d, kind: d.kind, seed: Math.floor(rnd() * 1e9), glow: 0, life: 1, grow: 0, vis: 0, ready: 0, A: 0, st: -1e9, sy0: 0, gy: 0, px: 0, py: 0, sx: 0, sy: 0, ja: 1, jb: 0, jd: 1, hx: 0, hy: 0, L: 2, dead: 0 };
    let ew, ar, L = 2;
    c.sp = 1;
    if (g === "cu") {
      ew = S * (0.15 + 0.6 * u * u); L = u > 0.78 ? 3 : u < 0.3 ? 1 : 2;
      c.sp = rnd() < 0.5 - 0.4 * u ? 0 : rnd() < 0.62 + 0.3 * u ? 1 : 2; ar = c.sp === 0 ? 0.42 + 0.12 * rnd() : c.sp === 1 ? 0.6 + 0.15 * rnd() : 0.9 + 0.2 * rnd();
    }
    else if (g === "cb") { ew = S * (0.9 + 0.6 * u); ar = 0.75 + 0.15 * rnd(); c.sp = 2; }
    else if (g === "fr") { ew = S * (0.18 + 0.3 * u); ar = 0.5; L = 3; c.sp = 0; }
    else if (g === "sc") { ew = S * (0.9 + 0.8 * u); ar = 0.38 + 0.12 * rnd(); }
    else if (g === "ac") { ew = S * (0.4 + 0.45 * u); ar = 0.55 + 0.2 * rnd(); L = rnd() < 0.5 ? 0 : 1; }
    else if (g === "ci") { ew = S * (0.7 + 0.8 * u); ar = 0.3 + 0.1 * rnd(); L = 0; }
    else if (g === "ns") { ew = S * (1.3 + 0.9 * u); ar = 0.55 + 0.15 * rnd(); L = u < 0.5 ? 1 : 2; }
    else { ew = S * (1 + 0.8 * u); ar = 0.45; L = 3; }
    c.L = L; c.ew = ew; c.eh = ew * ar; c.spd = 0.85 + 0.3 * rnd();
    c.cw = Math.max(16, Math.ceil(ew * KS * d.k)); c.ch = Math.max(12, Math.ceil(c.eh * KS * d.k));
    return c;
  }

  function spot(c, rnd) {
    const W = G.W, H = G.H;
    let best = null, bs = -1;
    for (let k = 0; k < 8; k++) {
      const p = toPlane(-W * 0.05 + rnd() * W * 1.1, -H * 0.05 + rnd() * H * 1.1);
      let m = 1e9;
      for (const o of list) if (o.L === c.L && !o.dead) m = Math.min(m, Math.hypot(o.px - p[0], o.py - p[1]) / (0.5 * (o.ew + c.ew)));
      if (m > bs) { bs = m; best = p; }
    }
    c.px = best[0]; c.py = best[1]; place(c);
  }

  function upwind(c, rnd) {
    const wx = G.wind.x, wy = G.wind.y * 0.6, m = Math.hypot(wx, wy) || 1, dx = wx / m, dy = wy / m;
    const X = toPlane(G.W, G.H / 2)[0], Y = toPlane(G.W / 2, G.H)[1], span = Math.abs(dy) * X + Math.abs(dx) * Y + c.eh * 0.5, t = (rnd() * 2 - 1) * span;
    c.px = -dy * t; c.py = dx * t; place(c);
    for (let i = 0; i < 80 && c.vis; i++) { c.px -= dx * G.S * 0.05; c.py -= dy * G.S * 0.05; place(c); }
  }

  function targets() {
    const cv = cover(), o = smooth((cv - 0.5) / 0.4), rn = wt("rain"), st = wt("storm"), sn = wt("snow"), fg = wt("fog"), lo = lowSun();
    const ak = (G.W * G.H) / (G.S * G.S), wet = Math.max(rn, sn), mist = clamp((fg - 0.3) / 0.5, 0, 1), deck = clamp((cv - 0.55) / 0.3, 0, 1);
    return {
      cu: ak * (2 + 4.5 * Math.min(1, cv / 0.5)) * (1 - 0.7 * o) * (1 - 0.8 * wet) * (1 - 0.6 * mist) * (1 - st),
      cb: ak * 0.9 * st,
      fr: ak * (2.2 * rn + 1.8 * st) * (1 - sn),
      sc: ak * (0.4 * smooth((cv - 0.35) / 0.25) + 2.2 * o) * (1 - 0.6 * st) * (1 - 0.5 * mist),
      ac: (0.5 + 1.3 * lo) * (1 - 0.7 * o) * (1 - mist) * (1 - wet),
      ci: (0.8 + 1.8 * lo) * (1 - o) * (1 - 0.9 * mist),
      ns: ak * (2.2 * wet + 1.5 * st) * deck,
      mi: ak * 3.2 * mist,
    };
  }

  function census() {
    const n = {};
    for (const g in GEN) n[g] = 0;
    for (const c of list) if (!c.dead && c.grow >= 0) n[c.g]++;
    return n;
  }

  function add(c) { list.push(c); jobs.push(c); list.sort((a, b) => a.L - b.L || a.id - b.id); }

  function seedField() {
    const rnd = G.rnd, tg = targets();
    list = []; jobs = []; rr = 0;
    for (const g in tg) for (let i = 0, n = Math.round(tg[g]); i < n; i++) { const c = make(g, rnd); spot(c, rnd); add(c); }
  }

  function regulate(dt) {
    spawnT -= dt;
    if (spawnT > 0) return;
    const rnd = G.rnd, tg = targets(), n = census();
    let best = null, gap = 0.5, worst = null, over = 0.9;
    for (const g in tg) { const k = tg[g] - n[g]; if (k > gap) { gap = k; best = g; } if (-k > over) { over = -k; worst = g; } }
    if (best) {
      const c = make(best, rnd);
      if (gap > 1.5 || rnd() < 0.25) { spot(c, rnd); c.life = 0; c.grow = 1; c.tf = 14 + rnd() * 14; }
      else upwind(c, rnd);
      add(c); spawnT = 0.8 + rnd() * 1.4;
    } else if (worst) {
      const pool = list.filter((c) => c.g === worst && c.grow === 0 && !c.dead);
      if (pool.length) { const c = pool[Math.floor(rnd() * pool.length)]; c.grow = -1; c.tf = 12 + rnd() * 12; }
      spawnT = 1 + rnd();
    } else spawnT = 0.5;
  }

  function step(dt) {
    const S = G.S, wind = G.wind, wx = wind.x, wy = wind.y * 0.6, wm = Math.hypot(wx, wy) || 1;
    R0 = 0.5 * Math.hypot(G.W, G.H);
    const [sx, sy] = Mood.sunAt();
    sun[0] = sx; sun[1] = sy;
    for (const c of list) {
      const sp = LAYER[c.L].sp * S * c.spd;
      c.px += wx * sp * dt; c.py += wy * sp * dt;
      if (c.grow > 0) { c.life = Math.min(1, c.life + dt / c.tf); if (c.life >= 1) c.grow = 0; }
      else if (c.grow < 0) { c.life -= dt / c.tf; if (c.life <= 0) c.dead = 1; }
      place(c);
      if (!c.vis && (c.px * wx + c.py * wy) / wm > 0) c.dead = 1;
      if (Math.hypot(c.px, c.py) > R0 * 4) c.dead = 1;
      c.A = clamp(c.life * 4, 0, 1);
      let gl = 0;
      if (c.ready && c.vis && c.kind !== 3 && c.kind !== 5) { const v = cov(c, sx, sy); gl = 4 * v * (1 - v); }
      c.glow += (gl - c.glow) * Math.min(1, dt * 3);
    }
    if (list.some((c) => c.dead)) { list = list.filter((c) => !c.dead); jobs = jobs.filter((c) => !c.dead); }
    regulate(dt);
  }

  function cov(c, x, y) {
    if (!c.ready) return 0;
    const dx = x - c.sx, dy = y - c.sy, det = c.ja * c.jd - c.jb * c.jb || 1, ox = (c.jd * dx - c.jb * dy) / det, oy = (-c.jb * dx + c.ja * dy) / det;
    const px = (ox / c.ew + 0.5) * c.cw, py = (oy / c.eh + 0.5) * c.ch;
    if (px < 1 || py < 1 || px >= c.cw - 1 || py >= c.ch - 1) return 0;
    const Q = c.Q, d = c.D[(py | 0) * c.cw + (px | 0)];
    if (!Q[1]) return 0;
    const a = clamp((d - Q[0]) * Q[1], 0, 1);
    return a * a * (3 - 2 * a) * Q[39] * c.A;
  }

  function veil(x, y) {
    let k = 1;
    for (const c of list) if (c.ready && c.vis && Math.abs(x - c.sx) < c.hx && Math.abs(y - c.sy) < c.hy) k *= 1 - cov(c, x, y);
    return 1 - k;
  }

  function prepare() {
    const t = G.t, catchup = full || t - drawT > 0.25;
    drawT = t; full = 0;
    let gb = catchup ? 1e12 : 16000;
    while (jobs.length && gb > 0) { const c = jobs[0]; gb -= gen(c, catchup ? 1e12 : gb); if (c.ready) jobs.shift(); }
    let rb = catchup ? 1e12 : 22000;
    const n = list.length;
    for (let k = 0; k < n && rb > 0; k++) {
      rr %= n;
      const c = list[rr];
      if (c.ready && c.vis && (catchup || c.sy0 > 0 || t - c.st > (c.grow !== 0 || c.glow > 0.05 ? 0.12 : 0.4))) {
        if (c.sy0 === 0) c.st = t;
        const rows = catchup ? c.ch : Math.max(1, Math.floor(rb / c.cw)), y1 = Math.min(c.ch, c.sy0 + rows);
        rb -= shade(c, c.sy0, y1);
        c.sy0 = y1 >= c.ch ? 0 : y1;
        if (c.sy0 > 0) break;
      }
      rr++;
    }
  }

  function warm(ms) {
    if (!full) return true;
    const end = performance.now() + ms;
    while (jobs.length) { if (performance.now() > end) return false; const c = jobs[0]; gen(c, 60000); if (c.ready) jobs.shift(); }
    for (; wi < list.length; wi++) {
      if (performance.now() > end) return false;
      const c = list[wi];
      if (c.ready && c.vis) { c.st = G.t; shade(c, 0, c.ch); c.sy0 = 0; }
    }
    full = 0; drawT = G.t;
    return true;
  }

  /* PAINT */

  function makeFog() {
    const T = G.T, n = 128, c = document.createElement("canvas");
    c.width = c.height = n;
    const g = c.getContext("2d"), col = Core.mix(T.rim, T.body, 0.5);
    const gr = g.createRadialGradient(n / 2, n / 2, 0, n / 2, n / 2, n * 0.72);
    gr.addColorStop(0, Core.rgba(col, 0.35)); gr.addColorStop(0.6, Core.rgba(col, 0.7)); gr.addColorStop(1, Core.rgba(col, 1));
    g.fillStyle = gr; g.fillRect(0, 0, n, n);
    return c;
  }

  function drawFog() {
    const { ctx, W, H } = G, f = wt("fog");
    if (f <= 0.01) return;
    if (!fogC || fogK !== G.T.key) { fogC = makeFog(); fogK = G.T.key; }
    ctx.globalAlpha = 0.42 * f;
    ctx.drawImage(fogC, -W * 0.1, -H * 0.1, W * 1.2, H * 1.2);
    ctx.globalAlpha = 1;
  }

  function paint(c, m) {
    if (!c.ready || !c.vis || c.A <= 0.003 || c.st < -1e8) return;
    const { ctx } = G;
    ctx.setTransform(m.a * c.ja + m.c * c.jb, m.b * c.ja + m.d * c.jb, m.a * c.jb + m.c * c.jd, m.b * c.jb + m.d * c.jd, m.a * c.sx + m.c * c.sy + m.e, m.b * c.sx + m.d * c.sy + m.f);
    ctx.globalAlpha = c.A;
    ctx.drawImage(c.can, -c.ew / 2, -c.eh / 2, c.ew, c.eh);
  }

  function draw(pass) {
    const { ctx } = G;
    if (pass === 0) prepare();
    const m = ctx.getTransform();
    if (pass === 0) {
      for (const c of list) if (c.L < 2) paint(c, m);
      ctx.setTransform(m); drawFog();
      for (const c of list) if (c.L === 2) paint(c, m);
    } else if (pass === 1) { for (const c of list) if (c.L === 3) paint(c, m); }
    else for (const c of list) if (c.L === 4) paint(c, m);
    ctx.setTransform(m); ctx.globalAlpha = 1;
  }

  function build(resized) {
    if (!N0) { [N0, NT] = noiseTex(7331, 4); NC = noiseTex(7331, 2)[1]; [N1] = noiseTex(9157, 4); }
    R0 = 0.5 * Math.hypot(G.W, G.H);
    KS = clamp(Math.sqrt(BUDGET / Math.max(1, G.W * G.H)), 0.3, 1);
    const [sx, sy] = Mood.sunAt();
    sun[0] = sx; sun[1] = sy;
    if (resized || !list.length) seedField();
    for (const c of list) { c.st = c.ready ? c.st : -1e9; c.sy0 = 0; }
    full = 1; wi = 0; palK = ""; fogK = "";
  }

  return { build, step, draw, veil, warm, clouds: () => list };
})();
