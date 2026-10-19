const Bird = (() => {
  const { TAU, clamp, lerp, smooth, noise, mix, rgba, parse, format, P } = Core;
  const FOLD = 4, FLAT = 6, SKEW = 0.14, TILT = 0.12;
  const POSES = [[0.12, 0.06, 0.25], [0.45, 0.22, 0.25], [0.8, 0.4, 0.25], [1.08, 0.25, 0.25], [0.62, -0.25, -1.4], [1.2, -0.35, 0.15], [0.02, -0.12, 0.2]];
  const SOAR = POSES[0], GLIDE = POSES[FLAT], TUCK = POSES[FOLD], DEEP = [0.85, -0.3, -1.5], KITE = [0.32, -0.32, 0.02], HALF = [0.45, -0.25, -0.8], OPEN = [0.3, 0.6, 1.2];
  const LODS = [2, 3, 6], MODES = ["soar", "glide", "flap", "drift", "roam", "tumble", "dive", "pull", "away"], friends = [], want = [0, 0, 0];
  const flyer = (o) => Object.assign({ x: 0, y: 0, heading: 0, turn: 0, dturn: 0, bank: 0, dbank: 0, speed: 0, size: 0.5, ph: 0, beats: 0, amp: 0, ampT: 0, per: 0.55, up: 0.58, v: 0, wait: 0, base: GLIDE.slice(), vbase: [0, 0, 0], pose: GLIDE.slice(), key: -1, path: null }, o);
  const bird = flyer({ heading: 0.4, size: 0.8, goal: 0.8, rate: 0.02, dsize: 0, dir: 1, mode: "soar", timer: 18, span: 18, age: 0, frame: 0, flip: 1, roll: 0, hold: 1, since: 30, last: "", push: 1, cap: 0.45, ox: 0, oy: 0, lazy: 4, w: 0.42, cx: 0, cy: 0, tx: 0, ty: 0, kind: 0, depth: 0, dur: 1, done: 0, flinch: 0, n: 3 });
  let lods = [], bufs = [], bands = [], half = 0, opt = {}, meet = 140, started = false, R = null, tone = null, toneA = null, toneB = "", toneF = 1;
  const rnd = () => (R || (R = Core.rng(Math.floor(G.rnd() * 4294967296))))();
  const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
  const steer = (a, pref) => { const e = wrap(a); return Math.abs(e) > 2.3 && e * pref < 0 ? e + Math.sign(pref) * TAU : e; };
  const ease = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * x * (x * (x * 6 - 15) + 10));
  const put = (o, a, b, k) => { for (let j = 0; j < 3; j++) o[j] = b ? lerp(a[j], b[j], k) : a[j]; return o; };

  /* FRAMES */

  function band(src) {
    const { axis, shoulder } = BIRD.rig;
    let poly = [];
    for (let i = 0; i < src.length; i += 2) poly.push([src[i], src[i + 1]]);
    for (const [lim, sgn] of [[axis - shoulder, 1], [axis + shoulder, -1]]) {
      const out = [];
      for (let i = 0; i < poly.length; i++) {
        const a = poly[i], b = poly[(i + 1) % poly.length], ia = (a[1] - lim) * sgn >= 0, ib = (b[1] - lim) * sgn >= 0;
        if (ia) out.push(a);
        if (ia !== ib) out.push([a[0] + ((lim - a[1]) / (b[1] - a[1])) * (b[0] - a[0]), lim]);
      }
      poly = out;
    }
    return Float32Array.from(poly.flatMap(([x, y]) => [x - half, y - 0.5]));
  }

  function toPath(pts) {
    const p = new Path2D();
    p.moveTo(pts[0], pts[1]);
    for (let i = 2; i < pts.length; i += 2) p.lineTo(pts[i], pts[i + 1]);
    p.closePath();
    return p;
  }

  function makeFrames() {
    half = Avatar.width(BIRD) / 2;
    lods = LODS.map((n) => Float32Array.from(Avatar.flatten(BIRD.outline.cubics, n).flat()));
    bufs = lods.map((a) => new Float32Array(a.length));
    bands = lods.map((a) => toPath(band(a)));
  }

  function shape(p, lod, tilt) {
    const src = lods[lod], out = bufs[lod], { axis, shoulder, blend } = BIRD.rig, yc = axis - 0.5;
    const flap = p[0], bend = p[1], sweep = p[2], sf = Math.sin(flap), cf = Math.cos(flap), straight = Math.abs(bend) < 1e-6;
    for (let i = 0; i < src.length; i += 2) {
      const x = src[i], y = src[i + 1], s = y - axis, d = Math.abs(s) - shoulder;
      let X = x, Y = y;
      if (d > 0) {
        const f = smooth(d / blend), L = straight ? d * cf : (Math.sin(flap + bend * d) - sf) / bend;
        X = x + f * sweep * d * d * sf; Y = y + f * (axis + Math.sign(s) * (shoulder + L) - y);
      }
      X -= half; Y -= 0.5;
      const g = 1 + tilt * (Y - yc);
      out[i] = X * g; out[i + 1] = yc + (Y - yc) * g;
    }
    return out;
  }

  function build(resized) {
    if (!lods.length) makeFrames();
    if (G.T) { tone = parse(G.T.bird); toneB = G.T.bird; toneF = 1; }
    if (!bird.x) { bird.x = G.W * 0.42; bird.y = G.H * 0.48; }
    if (!started) {
      started = true;
      meet = opt.friends ? 0 : 90 + rnd() * 110;
      enter(opt.mode || "soar");
    }
  }

  /* DIRECTOR */

  function damp(o, k, v, to, w, dt) {
    const c = o[k] - to, d = o[v] + w * c, e = Math.exp(-w * dt);
    o[k] = to + (c + d * dt) * e; o[v] = (d - w * (c + d * dt)) * e;
  }

  function follow(o, to, w, dt) {
    const e = Math.exp(-w * dt);
    for (let j = 0; j < 3; j++) {
      const c = o.base[j] - to[j], d = o.vbase[j] + w * c;
      o.base[j] = to[j] + (c + d * dt) * e; o.vbase[j] = (d - w * (c + d * dt)) * e;
    }
  }

  function wings(o, dt) {
    if (o.wait > 0) o.wait -= dt;
    else if (o.beats > 0 || o.ph > 0) {
      o.ph += dt / o.per;
      if (o.ph >= 1) { o.beats--; o.ph = o.beats > 0 ? o.ph - 1 : 0; }
    }
    o.amp += (o.ampT - o.amp) * (1 - Math.exp(-3.5 * dt));
    const U = o.up, up = o.ph < U, x = up ? o.ph / U : (o.ph - U) / (1 - U);
    const s = up ? 0.5 - 0.5 * Math.cos(Math.PI * x) : 0.5 + 0.5 * Math.cos(Math.PI * x), v = (up ? 1 : -1) * Math.sin(Math.PI * x), A = o.amp;
    o.v = v * A;
    o.pose[0] = o.base[0] + A * 0.96 * s;
    o.pose[1] = o.base[1] + A * (s * (0.1 + s * (1.665 - 1.575 * s)) - 0.28 * v);
    o.pose[2] = o.base[2] - A * 0.5 * v;
  }

  function flapTo(o, n, amp, per, up) {
    if (!o.beats && !o.ph) o.amp = amp * 0.55;
    o.beats = Math.max(o.beats, n); o.ampT = amp; o.per = per; o.up = up || 0.58;
  }

  function aim(b) {
    const W = G.W, H = G.H, S = G.S, mx = Math.min(0.5 * W, 0.17 * W + 0.17 * S * b.size), my = Math.min(0.5 * H, 0.15 * H + 0.17 * S * b.size);
    const wm = Math.hypot(G.wind.x, G.wind.y) + 1e-6, gale = 0.4 * clamp(wm - 1, 0, 2) / wm;
    let bs = -1e9;
    for (let i = 0; i < 6; i++) {
      const x = lerp(mx, W - mx, rnd()), y = lerp(my, H - my, rnd()), a = Math.abs(wrap(Math.atan2(y - b.y, x - b.x) - b.heading));
      const sc = Math.min(Math.hypot(x - b.x, y - b.y), 0.65 * S) - a * 0.22 * S - ((x - b.x) * G.wind.x + (y - b.y) * G.wind.y) * gale;
      if (sc > bs) { bs = sc; b.tx = x; b.ty = y; }
    }
  }

  function go(m) {
    const b = bird, S = G.S;
    if (MODES.indexOf(m) < 0) m = "soar";
    b.last = b.mode; b.mode = m; b.age = 0; b.hold = 1; b.rate = 0.05; b.done = 0;
    if (m === "soar") {
      b.span = 14 + rnd() * 14; b.dir = Math.abs(b.turn) > 0.12 ? Math.sign(b.turn) : rnd() < 0.5 ? 1 : -1; b.w = TAU / (14.5 + rnd() * 6);
      b.goal = Math.max(0.36, b.size - 0.1 - rnd() * 0.14); b.rate = 0.02; b.lazy = 5 + rnd() * 6; b.hold = 0;
      const r = (0.105 * S * b.size) / b.w;
      b.cx = b.x - Math.sin(b.heading) * r * b.dir; b.cy = b.y + Math.cos(b.heading) * r * b.dir;
    } else if (m === "glide") {
      b.span = 9 + rnd() * 9; b.hold = 0.1; aim(b);
      b.goal = clamp(b.size + 0.02 + rnd() * 0.06, 0.34, 1.0); b.rate = 0.015; b.lazy = 3 + rnd() * 6;
    } else if (m === "flap") {
      b.n = 2 + Math.floor(rnd() * 3); b.per = 0.52 + rnd() * 0.08; b.span = b.n * b.per + 0.6 + rnd() * 0.5; b.hold = 0.3;
      b.goal = clamp(b.size + 0.05 + rnd() * 0.07, 0.34, 1.05); b.rate = 0.1;
      flapTo(b, b.n, 0.92 + rnd() * 0.12, b.per);
    } else if (m === "drift") {
      b.span = 7 + rnd() * 5; b.dir = rnd() < 0.5 ? 1 : -1; b.hold = 0.55; b.lazy = 0.6;
      b.goal = clamp(b.size + 0.06, 0.34, 1.0); b.rate = 0.04;
    } else if (m === "roam") {
      b.span = 10 + rnd() * 10; b.dir = rnd() < 0.5 ? 1 : -1; b.hold = 0.2; b.lazy = 1 + rnd() * 2; aim(b);
      b.goal = clamp(lerp(b.size, 0.62, 0.35) + (rnd() - 0.5) * 0.14, 0.36, 0.95); b.rate = 0.03;
    } else if (m === "tumble") {
      b.kind = rnd() < 0.55 ? 1 : 0; b.dur = b.kind ? 1.8 + rnd() * 0.5 : 1.1 + rnd() * 0.4; b.depth = 1.0 + rnd() * 0.6;
      b.span = b.dur + 1.6 + rnd() * 0.8; b.dir = rnd() < 0.5 ? 1 : -1; b.hold = 0.6;
      b.goal = clamp(b.size + 0.04, 0.36, 1.0); b.rate = 0.05;
    } else if (m === "dive") {
      b.span = 1.4 + rnd() * 0.4; b.hold = 0; b.goal = 1.6; b.rate = 0.3; b.since = 0;
      b.tx = G.W * (0.4 + rnd() * 0.2); b.ty = G.H * (0.4 + rnd() * 0.2);
    } else if (m === "pull") {
      const side = Math.cos(b.heading) * (G.H / 2 - b.y) - Math.sin(b.heading) * (G.W / 2 - b.x);
      b.span = 3.4; b.dir = side > 0 ? 1 : -1; b.hold = 0.45;
      b.goal = 0.5 + rnd() * 0.1; b.rate = 0.55; b.w = 1.25 + rnd() * 0.4;
    } else if (m === "away") {
      b.span = 1.1; b.hold = 0; b.goal = 2.4; b.rate = 1.9;
    }
    b.timer = b.span;
  }

  function enter(m, p) {
    const b = bird;
    go(m);
    b.dturn = b.dbank = b.dsize = 0; b.roll = 0; b.ph = 0; b.v = 0; b.push = 1; b.cap = 0.45; b.speed = (m === "flap" ? 0 : 0.1) * G.S; b.wait = m === "flap" ? 0.12 : 0;
    put(b.base, p && p.length === 3 ? p : m === "dive" || m === "away" ? TUCK : SOAR); b.vbase.fill(0); put(b.pose, b.base);
    if (m === "flap") { b.amp = b.ampT; b.per = 0.5; }
  }

  function pick() {
    const b = bird, T = G.T;
    const wk = T && T.windK ? T.windK : 1, wm = Math.hypot(G.wind.x, G.wind.y);
    const hi = clamp((0.72 - b.size) / 0.38, 0, 1), lo = 1 - hi;
    const w = {
      soar: (1.4 + 1.3 * lo) * (1 - 0.8 * clamp((wm - 1.3) / 1.5, 0, 1)),
      glide: 1.2 + 1.0 * hi,
      flap: 0.6 + 1.5 * lo,
      drift: 0.2 + 1.9 * clamp(wm - 0.9, 0, 1.4),
      roam: 1.4,
      tumble: 0.35 + 0.5 * wk,
      dive: b.since > 24 && b.size < 0.8 ? 0.45 + 1.1 * hi : 0
    };
    if (b.mode === "soar") w.soar *= 0.55; else w[b.mode] = 0;
    let sum = 0;
    for (const k in w) sum += w[k];
    let r = rnd() * sum;
    for (const k in w) { r -= w[k]; if (r <= 0) return k; }
    return "glide";
  }

  function dive() {
    const b = bird;
    if (b.mode === "dive" || b.mode === "away" || b.mode === "pull") return;
    go("dive");
  }

  /* FRIENDS */

  function spawn(n) {
    const W = G.W, H = G.H, S = G.S;
    for (let i = 0; i < n; i++) {
      const e = Math.floor(rnd() * 4);
      const x = e === 0 ? -0.08 * W : e === 1 ? 1.08 * W : rnd() * W;
      const y = e === 2 ? -0.08 * H : e === 3 ? 1.08 * H : rnd() * H;
      const f = flyer({
        x, y, heading: Math.atan2(bird.y - y, bird.x - x), speed: 0.18 * S,
        rel: 0.45 + rnd() * 0.25, size: bird.size * 0.5, ang: rnd() * TAU, spin: rnd() < 0.5 ? 1 : -1,
        role: "join", timer: 2.5 + rnd() * 3, life: 15 + rnd() * 25, per: 0.3 + rnd() * 0.1,
        rest: 0, off: rnd() * 9, ex: 0, ey: 0, glide: 0, hit: 0
      });
      flapTo(f, 4 + Math.floor(rnd() * 3), 0.9, f.per, 0.55);
      friends.push(f);
    }
  }

  function stepFriend(f, dt, wk) {
    const b = bird, S = G.S, W = G.W, H = G.H, t = G.t;
    f.life -= dt; f.timer -= dt; f.rest -= dt;
    if (f.life <= 0 && f.role !== "leave") {
      const e = Math.floor(rnd() * 4);
      f.role = "leave";
      f.ex = e === 0 ? -0.4 * W : e === 1 ? 1.4 * W : f.x + (rnd() - 0.5) * W;
      f.ey = e === 2 ? -0.4 * H : e === 3 ? 1.4 * H : f.y + (rnd() - 0.5) * H;
    }
    let tx, ty;
    const hs = 0.15 * S * b.size, fs = 0.15 * S * f.size, r = (hs + fs) * (1.35 + 0.35 * Math.sin(t * 0.4 + f.off)), ch = Math.cos(b.heading), sh = Math.sin(b.heading);
    if (f.role === "leave") { tx = f.ex; ty = f.ey; }
    else {
      if (f.timer <= 0) {
        f.role = ["orbit", "cross", "chase", "orbit", "mob"][Math.floor(rnd() * 5)];
        f.timer = f.role === "mob" ? 3.2 : 3.5 + rnd() * 5; f.spin = rnd() < 0.5 ? 1 : -1; f.hit = 0;
        if (rnd() < 0.35) f.rest = 0.6 + rnd() * 1.2;
      }
      if (f.role === "cross") {
        f.ang += f.spin * dt * 0.7;
        tx = b.x - ch * r * 0.6 - sh * Math.sin(f.ang) * r * 1.5;
        ty = b.y - sh * r * 0.6 + ch * Math.sin(f.ang) * r * 1.5;
      } else if (f.role === "chase") {
        tx = b.x - ch * r * 1.3 + noise(t * 0.5, f.off | 0) * r * 0.35;
        ty = b.y - sh * r * 1.3 + noise(t * 0.45, (f.off | 0) + 20) * r * 0.35;
      } else if (f.role === "mob") {
        tx = b.x + ch * (hs + fs) * 1.6 - sh * f.spin * (hs + fs) * 0.75; ty = b.y + sh * (hs + fs) * 1.6 + ch * f.spin * (hs + fs) * 0.75;
        if (!f.hit && Math.hypot(b.x - f.x, b.y - f.y) < (hs + fs) * 0.95) f.hit = 1;
        if (Math.hypot(tx - f.x, ty - f.y) < (hs + fs) * 0.5) { f.role = "cross"; f.timer = 2 + rnd() * 2; f.ang = 0; }
      } else {
        f.ang += f.spin * dt * (f.role === "join" ? 0.4 : 0.75);
        tx = b.x + Math.cos(f.ang) * r;
        ty = b.y + Math.sin(f.ang) * r * 0.8;
      }
    }
    let ax = tx - f.x, ay = ty - f.y;
    const d = Math.hypot(ax, ay) + 1e-6;
    ax /= d; ay /= d;
    for (let i = -1; i < friends.length; i++) {
      const o = i < 0 ? b : friends[i];
      if (o === f) continue;
      const ox = f.x - o.x, oy = f.y - o.y, od = Math.hypot(ox, oy) + 1e-6, sep = (0.15 * S * o.size + fs) * (f.role === "mob" && i < 0 ? 0.8 : 1.25);
      if (od < sep) { const k = 3.5 * (sep - od) / sep / od; ax += ox * k; ay += oy * k; }
    }
    const turnT = clamp(steer(Math.atan2(ay, ax) - f.heading, f.turn) * 2.2, -2.1, 2.1);
    damp(f, "turn", "dturn", turnT, 3.2, dt);
    damp(f, "bank", "dbank", clamp(Math.atan(8 * turnT * f.speed / S), -0.8, 0.8) + 0.05 * wk * noise(t * 1.3, (f.off | 0) + 40), 5, dt);
    f.heading += f.turn * dt;
    f.speed += (clamp(0.05 * S + d * (f.role === "mob" ? 1.4 : 0.8), 0.08 * S, (f.role === "mob" ? 0.6 : 0.45) * S) - f.speed) * (1 - Math.exp(-2 * dt));
    f.size += (Math.min(0.92, b.size * f.rel) - f.size) * (1 - Math.exp(-0.7 * dt));
    f.x += Math.cos(f.heading) * f.speed * (0.45 + f.size) * dt + G.wind.x * 0.012 * S * (0.4 + f.size) * wk * dt;
    f.y += Math.sin(f.heading) * f.speed * (0.45 + f.size) * dt + G.wind.y * 0.012 * S * (0.4 + f.size) * wk * dt;
    if (!f.beats && !f.ph) {
      f.glide -= dt;
      if (f.glide <= 0 && f.rest <= 0) {
        const far = d > r * 1.6 || f.role === "leave" || f.role === "mob";
        flapTo(f, 2 + Math.floor(rnd() * 4) + (far ? 2 : 0), 0.82 + rnd() * 0.22, f.per * (0.9 + rnd() * 0.2), 0.55);
        f.glide = far ? 0.2 + rnd() * 0.5 : 0.5 + rnd() * 1.3;
      }
    }
    put(want, GLIDE, SOAR, clamp(Math.abs(f.turn) * 0.6, 0, 1));
    want[0] += 0.03 * noise(t * 0.5, (f.off | 0) + 50); want[2] += 0.06 * noise(t * 0.4, (f.off | 0) + 60);
    follow(f, want, 6, dt);
    wings(f, dt);
    return !(f.role === "leave" && (f.x < -0.22 * W || f.x > 1.22 * W || f.y < -0.22 * H || f.y > 1.22 * H));
  }

  /* STEP */

  function step(dt) {
    const b = bird, t = G.t, S = G.S, W = G.W, H = G.H, T = G.T;
    const wk = T && T.windK ? T.windK : 1, wx = G.wind.x, wy = G.wind.y, wm = Math.hypot(wx, wy);
    b.timer -= dt; b.age += dt; b.since += dt; b.lazy -= dt; b.flinch -= dt;
    const u = clamp(1 - b.timer / b.span, 0, 1), m = b.mode;
    let turnT = 0.035 * noise(t * 0.7, 21), speedT = 0.12 * S, pose = GLIDE, pose2 = null, pk = 0, wp = 4.5, wt = 1.9, wb = 3.6, ws = 1.2, push = 1, lean = 0, calm = 1, cap = 0.65, lim = 0.9;
    b.roll = 0;
    if (m === "soar") {
      const w = b.w * (1 + 0.12 * noise(t * 0.13, 5)), r = (b.speed * b.size) / w, dx = b.cx - b.x, dy = b.cy - b.y, dist = Math.hypot(dx, dy);
      const hx = clamp(W / 2 - 0.1 * W - 0.17 * S * b.size - r, 0, 0.14 * W), hy = clamp(H / 2 - 0.09 * H - 0.17 * S * b.size - r, 0, 0.09 * H);
      const gx = W / 2 + 0.5 * hx * noise(t * 0.02, 9) - b.cx, gy = H / 2 + 0.5 * hy * noise(t * 0.02, 10) - b.cy;
      const pc = 0.025 * S + 1.5 * Math.hypot(b.ox, b.oy);
      b.cx += (b.ox + clamp(0.6 * (gx - clamp(gx, -hx, hx)), -pc, pc)) * dt; b.cy += (b.oy + clamp(0.6 * (gy - clamp(gy, -hy, hy)), -pc, pc)) * dt;
      turnT += b.dir * w + 0.75 * steer(Math.atan2(dy, dx) - b.dir * (Math.PI / 2 - clamp(0.9 * (dist - r) / r, -0.8, 0.8)) - b.heading, b.dir);
      wt = 2.4; speedT = 0.105 * S; pose = SOAR; lim = 1.1;
      b.goal = Math.max(0.36, b.goal - 0.003 * dt);
      if (b.lazy < 0) { b.lazy = 7 + rnd() * 9; flapTo(b, rnd() < 0.35 ? 2 : 1, 0.45 + rnd() * 0.25, 0.68 + rnd() * 0.12); }
      if (b.timer < 0) go(pick());
    } else if (m === "glide") {
      turnT += clamp(0.7 * wrap(Math.atan2(b.ty - b.y, b.tx - b.x) - b.heading), -0.45, 0.45) * smooth(b.age / 2.5) + 0.08 * noise(t * 0.3, 7);
      if (Math.hypot(b.tx - b.x, b.ty - b.y) < 0.15 * S) aim(b);
      speedT = 0.135 * S; pose = GLIDE; lim = 0.75;
      if (b.lazy < 0) { b.lazy = 5 + rnd() * 8; flapTo(b, rnd() < 0.5 ? 2 : 1, 0.6 + rnd() * 0.25, 0.6 + rnd() * 0.1); }
      if (b.timer < 0) go(pick());
    } else if (m === "flap") {
      turnT += 0.06 * noise(t * 0.7, 15);
      speedT = S * (0.12 + 0.13 * Math.min(1, b.age / (b.n * b.per))); pose = SOAR;
      if (b.timer < 0) go("glide");
    } else if (m === "drift") {
      const into = Math.atan2(-wy, -wx), d = wrap(into - b.heading), k = smooth((u - 0.66) / 0.24);
      const drift = Math.min(0.013 * S * (0.45 + 0.85 * b.size) * b.push * wm, b.cap * b.speed * b.size + 1e-6);
      push = 2.4; wt = 2.3; lim = 1.2;
      turnT += lerp(clamp(d * 1.4, -0.9, 0.9), b.dir * 1.0, k);
      const down = clamp(((b.x - W / 2) * wx + (b.y - H / 2) * wy) / (wm * 0.35 * S + 1e-6), -1, 1);
      speedT = lerp(Math.max(0.035 * S, (drift / b.size) * (1 + 0.3 * down + 0.06 * noise(t * 0.23, 22))), 0.15 * S, k);
      pose = KITE; pose2 = SOAR; pk = k; calm = 1 - k;
      lean = (1 - k) * 0.16 * noise(t * 1.1, 23);
      if (k < 0.05 && b.lazy < 0) { b.lazy = 0.8 + rnd() * 1.6; flapTo(b, 1, 0.28 + rnd() * 0.16, 0.34 + rnd() * 0.06); }
      if (k > 0.15 && !b.done) { b.done = 1; flapTo(b, 2, 0.95, 0.52); }
      if (b.timer < 0) go(pick());
    } else if (m === "roam") {
      const s = Math.sin(u * TAU * 1.6 + 0.4);
      turnT += b.dir * 0.36 * s + clamp(0.5 * wrap(Math.atan2(b.ty - b.y, b.tx - b.x) - b.heading), -0.35, 0.35) + 0.08 * noise(t * 0.5, 17);
      if (Math.hypot(b.tx - b.x, b.ty - b.y) < 0.2 * S) aim(b);
      speedT = 0.12 * S; pose = GLIDE; pose2 = SOAR; pk = Math.abs(s);
      if (b.lazy < 0) { b.lazy = 3 + rnd() * 3.5; flapTo(b, 2, 0.7 + rnd() * 0.2, 0.56 + rnd() * 0.06); }
      if (b.timer < 0) go(pick());
    } else if (m === "tumble") {
      const x = clamp(b.age / b.dur, 0, 1), k = Math.sin(Math.PI * x);
      b.roll = x >= 1 ? 0 : b.kind ? b.dir * TAU * ease(x) : b.dir * b.depth * Math.sin(Math.PI * ease(x));
      turnT += b.dir * 0.45 * k; wt = 2.6; wp = 8; lim = 1.2;
      speedT = 0.125 * S; pose = GLIDE; pose2 = HALF; pk = k * k * (3 - 2 * k);
      if (x >= 1 && !b.done) { b.done = 1; flapTo(b, 2, 0.85, 0.54); }
      if (b.timer < 0) go(pick());
    } else if (m === "dive") {
      const d = wrap(Math.atan2(b.ty - b.y, b.tx - b.x) - b.heading), near = smooth(Math.hypot(b.tx - b.x, b.ty - b.y) / (0.12 * S));
      turnT += clamp(d * 3.2, -2.6, 2.6) * lerp(1, 0.45, smooth((b.age - 0.35) / 0.4)) * near + 0.1 * noise(t * 0.8, 18);
      wt = 4.5; wb = 6.5; ws = 2.6; wp = 7; calm = 0.5; cap = 1.05; lim = 2.8;
      speedT = S * (0.1 + 0.06 * u); pose = TUCK; pose2 = DEEP; pk = smooth(u * 1.3);
      b.rate = 0.3 + 3.2 * u * u;
      if (b.timer < 0) go(b.size > 1.3 && rnd() < 0.4 ? "away" : "pull");
    } else if (m === "pull") {
      turnT += b.dir * b.w * 2.4 * (1 - u) * (b.speed * b.size / S); wt = 3.2; wb = 5; ws = 1.4; cap = 1.05; lim = 2.8;
      speedT = S * (0.36 - 0.24 * u);
      if (b.age < 0.8) { pose = OPEN; wp = 10; } else pose = SOAR;
      if (b.age > 0.1 && !b.done) { b.done = 1; flapTo(b, 3, 1.05, 0.46, 0.55); }
      if (b.timer < 0) go("glide");
    } else if (m === "away") {
      ws = 2; speedT = S * 0.6; pose = TUCK; pose2 = HALF; pk = clamp(b.age / 0.6, 0, 1); calm = 0.5;
      const rr = 0.2 * S * b.size;
      if (b.x < -rr || b.x > W + rr || b.y < -rr || b.y > H + rr || b.timer < -4) {
        const e = Math.floor(rnd() * 4), o = 0.1 * S;
        b.x = e === 0 ? -o : e === 1 ? W + o : W * (0.2 + 0.6 * rnd());
        b.y = e === 2 ? -o : e === 3 ? H + o : H * (0.2 + 0.6 * rnd());
        b.heading = Math.atan2(H / 2 - b.y, W / 2 - b.x) + (rnd() - 0.5) * 0.6;
        b.size = 0.42; b.speed = 0.2 * S; b.turn = b.dturn = b.bank = b.dbank = b.dsize = 0;
        go("flap"); put(b.base, SOAR); b.vbase.fill(0);
        speedT = 0.2 * S; pose = SOAR; pose2 = null;
      }
    }

    /* KEEP */

    if (m !== "dive" && m !== "away") {
      const inx = Math.max(0, 0.06 * W - b.x, b.x - 0.94 * W) / (0.06 * W), iny = Math.max(0, 0.06 * H - b.y, b.y - 0.94 * H) / (0.06 * H), out = clamp(Math.max(inx, iny), 0, 1);
      lim += 1.2 * out;
      if (out > 0 && m !== "drift") { speedT *= 1 + 0.7 * out; if (b.lazy < 0) { b.lazy = 1.4 + rnd(); flapTo(b, 2, 0.95, 0.5); } }
      const ahead = m === "soar" ? 0.6 : 2.4, px = b.x + (Math.cos(b.heading) * b.speed * b.size + b.ox) * ahead, py = b.y + (Math.sin(b.heading) * b.speed * b.size + b.oy) * ahead;
      const cx = W / 2 + 0.12 * W * noise(t * 0.02, 9), cy = H / 2 + 0.12 * H * noise(t * 0.02, 10);
      const dx = cx - px, dy = cy - py, dist = Math.hypot(dx, dy), limit = 0.3 * S, mx = 0.1 * W + 0.17 * S * b.size, my = 0.09 * H + 0.17 * S * b.size;
      let ax = 0, ay = 0;
      if (dist > limit) { const k = b.hold * Math.min(1.5, (dist - limit) / limit) / dist; ax += dx * k; ay += dy * k; }
      if (px < mx) ax += 1.4 * (mx - px) / mx;
      if (px > W - mx) ax -= 1.4 * (px - W + mx) / mx;
      if (py < my) ay += 1.4 * (my - py) / my;
      if (py > H - my) ay -= 1.4 * (py - H + my) / my;
      const am = Math.hypot(ax, ay);
      if (am > 0) turnT += clamp(steer(Math.atan2(ay, ax) - b.heading, Math.abs(turnT) > 0.1 ? turnT : b.turn) * Math.min(2, am) * 0.8, -1.1, 1.1);
    }
    turnT = clamp(turnT, -lim, lim);
    const cross = clamp(Math.cos(b.heading) * wy - Math.sin(b.heading) * wx, -1.5, 1.5) * 0.07;
    const bankT = clamp(Math.atan(9 * turnT * b.speed / S), -cap, cap) + lean + cross * calm + 0.035 * (0.6 + Math.min(wm, 2.5)) * calm * noise(t * 0.9, 24);
    damp(b, "turn", "dturn", turnT, wt, dt);
    damp(b, "bank", "dbank", bankT, wb, dt);
    b.speed += (speedT - b.speed) * (1 - Math.exp(-ws * dt)) + Math.max(0, -b.v) * 0.05 * S * dt;
    const vs = clamp((b.goal - b.size) * 1.6, -b.rate, b.rate);
    b.dsize += (vs - b.dsize) * (1 - Math.exp(-dt / (m === "dive" ? 0.15 : 0.3)));
    b.size += b.dsize * dt;
    b.heading += b.turn * dt;
    b.push += (push - b.push) * (1 - Math.exp(-1.5 * dt));
    b.cap += ((m === "drift" ? 1.15 : 0.45) - b.cap) * (1 - Math.exp(-1.5 * dt));
    const drag = 0.013 * S * (0.45 + 0.85 * b.size) * b.push, wc = b.cap * b.speed * b.size;
    let ox = wx * drag, oy = wy * drag;
    const om = Math.hypot(ox, oy);
    if (om > wc) { ox *= wc / om; oy *= wc / om; }
    b.ox = ox; b.oy = oy;
    b.x += Math.cos(b.heading) * b.speed * b.size * dt + ox * dt;
    b.y += Math.sin(b.heading) * b.speed * b.size * dt + oy * dt;
    put(want, pose, pose2, pk);
    const gale = clamp(wm - 1, 0, 2);
    want[0] += calm * (0.025 * noise(t * 0.45, 31) + 0.012 * wm * noise(t * 3.1, 34) + 0.05 * gale);
    want[1] += calm * (0.05 * noise(t * 0.37, 32) - 0.05 * gale);
    want[2] += calm * 0.06 * noise(t * 0.31, 33);
    follow(b, want, wp, dt);
    wings(b, dt);
    b.flip = Math.cos(b.bank + b.roll) < 0 ? -1 : 1;
    if (T && T.bird !== toneB) { toneA = tone ? tone.slice() : parse(T.bird); toneB = T.bird; toneF = 0; }
    if (toneF < 1 && toneA) { toneF = Math.min(1, toneF + dt / 2.4); const to = parse(toneB), e = smooth(toneF); tone = toneA.map((v, j) => lerp(v, to[j], e)); }
    let best = 1e9;
    for (let k = 0; k < POSES.length; k++) {
      const q = POSES[k], e = (q[0] - b.pose[0]) ** 2 + 0.3 * (q[1] - b.pose[1]) ** 2 + 0.1 * (q[2] - b.pose[2]) ** 2;
      if (e < best) { best = e; b.frame = k; }
    }

    /* FRIENDS */

    if (opt.friends === undefined || opt.friends > 0) {
      meet -= dt;
      if (meet <= 0 && !friends.length) {
        spawn(opt.friends !== undefined ? opt.friends : (rnd() < 0.55 ? 1 : 2));
        meet = opt.friends !== undefined ? 25 + rnd() * 20 : 90 + rnd() * 110;
      }
    }
    for (let k = friends.length - 1; k >= 0; k--) {
      const f = friends[k];
      if (!stepFriend(f, dt, wk)) { friends.splice(k, 1); continue; }
      if (f.hit === 1 && b.flinch <= 0 && m !== "dive" && m !== "away" && m !== "tumble") {
        f.hit = 2; b.flinch = 4;
        b.dbank += (Math.cos(b.heading) * (f.y - b.y) - Math.sin(b.heading) * (f.x - b.x) > 0 ? -1 : 1) * 2.6;
        flapTo(b, 1, 0.8, 0.44);
      }
    }
  }

  /* PAINT */

  function rim(o, sun) {
    const T = G.T, S = G.S, d = Math.hypot(sun[0] - o.x, sun[1] - o.y), k = clamp(1 - (d - 0.16 * S * o.size) / (0.15 * S), 0, 1);
    if (k <= 0) return 0;
    const lit = T.sun ? (1 - 0.8 * (T.dark || 0)) * (1 - 0.85 * (T.storm || 0)) * (1 - 0.6 * (T.fog || 0)) : 0.55 * (1 - Math.abs(2 * (T.moon === undefined ? 0.5 : T.moon) - 1)) * (1 - (T.storm || 0));
    return smooth(k) * lit;
  }

  function trace(ctx, pts) {
    ctx.beginPath();
    ctx.moveTo(pts[0], pts[1]);
    for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]);
    ctx.closePath();
  }

  function outline(o, lod, tilt) {
    const q = o.pose, key = ((((((q[0] * 400 + 800) | 0) * 1000 + ((q[1] * 250 + 500) | 0)) * 1000 + ((q[2] * 150 + 500) | 0)) * 200 + ((tilt * 400 + 100) | 0)) * 3) + lod;
    if (o.key !== key) { o.key = key; o.path = toPath(shape(q, lod, tilt)); }
    return o.path;
  }

  function local(ctx, o, size, sr, cr, yc, y) {
    ctx.translate(o.x, o.y);
    ctx.rotate(o.heading);
    ctx.scale(size, size);
    ctx.translate(0, yc);
    ctx.transform(1, 0, SKEW * sr, y, 0, 0);
    ctx.translate(0, -yc);
  }

  function one(o, roll, ink, k, sun, glow) {
    const { ctx, S } = G, size = S * 0.3 * o.size, r = o.bank + roll, sr = Math.sin(r), cr = Math.cos(r), yc = BIRD.rig.axis - 0.5, lod = size < 90 ? 0 : size < 240 ? 1 : 2;
    ctx.fillStyle = ink;
    ctx.save();
    local(ctx, o, size, sr, cr, yc, cr);
    if (k <= 0.004) { ctx.fill(outline(o, lod, TILT * sr)); ctx.restore(); }
    else {
      trace(ctx, shape(o.pose, lod, TILT * sr));
      ctx.restore();
      ctx.fill();
      const R = 0.15 * S, g = ctx.createRadialGradient(sun[0], sun[1], 0, sun[0], sun[1], R), f = ctx.createRadialGradient(sun[0], sun[1], 0, sun[0], sun[1], R * 0.7);
      g.addColorStop(0, rgba(glow, k)); g.addColorStop(0.3, rgba(glow, 0.6 * k)); g.addColorStop(1, rgba(glow, 0));
      f.addColorStop(0, rgba(glow, (G.T.bird === P.white ? 0.3 : 0.14) * k)); f.addColorStop(1, rgba(glow, 0));
      ctx.save();
      ctx.fillStyle = f; ctx.fill();
      ctx.globalCompositeOperation = "lighter"; ctx.lineJoin = "round"; ctx.strokeStyle = g;
      if (G.T.bird !== P.white) { ctx.globalAlpha = 0.85; ctx.lineWidth = 1.4; ctx.stroke(); }
      ctx.globalAlpha = 0.28; ctx.lineWidth = 5; ctx.stroke();
      ctx.restore();
    }
    if (Math.abs(cr) < 0.7) {
      ctx.save();
      local(ctx, o, size, sr, cr, yc, Math.max(Math.abs(cr), 0.5));
      ctx.fill(bands[lod]);
      ctx.restore();
    }
  }

  function draw() {
    const T = G.T, b = bird;
    if (!lods.length) return;
    const d = clamp((1.05 - b.size) / 0.7, 0, 1) ** 1.5, haze = Math.min(0.85, d * (0.1 + 0.15 * (T.haze || 0) + 0.5 * (T.fog || 0)) + 0.6 * Math.sin(Math.PI * toneF));
    const base = tone ? format(tone) : T.bird, ink = haze > 0.003 ? mix(base, T.mid, haze) : base, sun = Mood.sunAt();
    const glow = T.sun ? mix(mix(T.warm || P.white, P.yellow, 0.3), P.white, 0.35) : mix(P.white, P.indigo, 0.15);
    const far = mix(base, T.mid, Math.min(0.6, haze + 0.1 + 0.08 * (T.haze || 0)));
    for (let i = 0; i < friends.length; i++) one(friends[i], 0, far, rim(friends[i], sun) * 0.7, sun, glow);
    one(b, b.roll, ink, rim(b, sun), sun, glow);
  }

  /* HOOKS */

  function init(q) {
    const f = q.get("friends");
    if (f !== null) opt.friends = clamp(Math.round(+f) || 0, 0, 3);
    const m = q.get("mode");
    if (m) opt.mode = m;
    addEventListener("keydown", (e) => {
      if (!G.visible || typing(e) || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "v") dive();
      if (e.key === "f" && !friends.length) spawn(1 + Math.floor(rnd() * 2));
    });
  }

  return { build, step, draw, dive, init, enter, bird, friends, POSES, pose: () => bird.pose.slice() };
})();
