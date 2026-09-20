const Bird = (() => {
  const { TAU, clamp, lerp, noise } = Core;
  const FOLD = 4, BRAKE = 5, FLAT = 6;
  const BEAT = [0, 1, 2, 3, 2, 1];
  const BRAKES = [5, 3, 5, 2];
  const POSES = [[0.12, 0.06, 0.25], [0.45, 0.22, 0.25], [0.8, 0.4, 0.25], [1.08, 0.25, 0.25], [0.62, -0.25, -1.4], [1.2, -0.35, 0.15], [0.02, -0.12, 0.2]];
  const friends = [];
  const bird = { x: 0, y: 0, heading: 0.4, turn: 0, bank: 0, speed: 0, size: 0.8, goal: 0.8, rate: 0.02, dir: 1, mode: "soar", timer: 18, span: 18, age: 0, frame: 0, flip: 1, roll: 0, beats: 3, hold: 1, since: 30, last: "" };
  let frames = [], tick = -1, shown = null, opt = {}, meet = 140, started = false;

  /* FRAMES */

  function makeFrames() {
    const base = Avatar.flatten(BIRD.outline.cubics, 6);
    const w = Avatar.width(BIRD);
    return POSES.map(([flap, bend, sweep]) => {
      const pts = Avatar.deform(base, { flap, bend, sweep }, BIRD.rig);
      const p = new Path2D();
      pts.forEach(([x, y], i) => (i ? p.lineTo(x - w / 2, y - 0.5) : p.moveTo(x - w / 2, y - 0.5)));
      p.closePath();
      return p;
    });
  }

  function build(resized) {
    if (!frames.length) frames = makeFrames();
    if (!bird.x) { bird.x = G.W * 0.42; bird.y = G.H * 0.48; }
    if (!started) {
      started = true;
      meet = opt.friends ? 0 : 90 + G.rnd() * 110;
      if (opt.mode) enter(opt.mode); else enter("soar");
    }
  }

  /* DIRECTOR */

  function enter(m) {
    const b = bird, rnd = G.rnd;
    b.last = b.mode; b.mode = m; b.age = 0; b.roll = 0; b.flip = 1; b.hold = 1; b.rate = 0.05;
    if (m === "soar") {
      b.span = 12 + rnd() * 16; b.dir = rnd() < 0.5 ? 1 : -1;
      b.goal = Math.max(0.34, b.size - 0.14 - rnd() * 0.14); b.rate = 0.02;
    } else if (m === "glide") {
      b.span = 7 + rnd() * 9; b.hold = 0.35;
      b.goal = clamp(b.size - 0.05, 0.34, 1.0); b.rate = 0.02;
    } else if (m === "flap") {
      b.beats = rnd() < 0.5 ? 2 : 3; b.span = b.beats * 0.5 + 0.7 + rnd() * 0.4; b.hold = 0.3;
      b.goal = clamp(b.size + 0.05 + rnd() * 0.07, 0.34, 1.05); b.rate = 0.1;
    } else if (m === "drift") {
      b.span = 5 + rnd() * 5; b.dir = rnd() < 0.5 ? 1 : -1; b.hold = 0.55;
      b.goal = clamp(b.size + 0.06, 0.34, 1.0); b.rate = 0.04;
    } else if (m === "roam") {
      b.span = 9 + rnd() * 9; b.dir = rnd() < 0.5 ? 1 : -1; b.hold = 0.7;
      b.goal = clamp(b.size + (rnd() - 0.5) * 0.14, 0.36, 0.95); b.rate = 0.03;
    } else if (m === "tumble") {
      b.span = 2.4 + rnd() * 1.1; b.dir = rnd() < 0.5 ? 1 : -1; b.hold = 0.6;
      b.goal = clamp(b.size + 0.03, 0.36, 1.0); b.rate = 0.05;
    } else if (m === "dive") {
      b.span = 1.25 + rnd() * 0.45; b.hold = 0; b.goal = 1.6; b.rate = 1.15; b.since = 0;
    } else if (m === "pull") {
      b.span = 3.0; b.dir = rnd() < 0.5 ? 1 : -1; b.hold = 0.15;
      b.goal = 0.5 + rnd() * 0.1; b.rate = 0.42;
      const rx = b.dir > 0 ? G.W * 1.1 : -0.1 * G.W;
      b.aim = Math.atan2(G.H * (0.2 + rnd() * 0.6) - b.y, rx - b.x);
    } else if (m === "away") {
      b.span = 1.1; b.hold = 0; b.goal = 2.4; b.rate = 1.9;
    }
    b.timer = b.span;
  }

  function pick() {
    const b = bird, rnd = G.rnd, T = G.T;
    const wk = T && T.windK ? T.windK : 1, wm = Math.hypot(G.wind.x, G.wind.y) * wk;
    const hi = clamp((0.72 - b.size) / 0.38, 0, 1), lo = 1 - hi;
    const w = {
      soar: 1.3 + 1.3 * lo,
      glide: 1.2 + 1.0 * hi,
      flap: 0.7 + 1.7 * lo,
      drift: 0.25 + 1.9 * clamp(wm - 0.75, 0, 1.4),
      roam: 1.2,
      tumble: 0.45 + 0.65 * wk,
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
    const tx = G.W * (0.4 + G.rnd() * 0.2), ty = G.H * (0.4 + G.rnd() * 0.2);
    b.heading = Math.atan2(ty - b.y, tx - b.x);
    enter("dive");
  }

  /* FRIENDS */

  function spawn(n) {
    const rnd = G.rnd, W = G.W, H = G.H, S = G.S;
    for (let i = 0; i < n; i++) {
      const e = Math.floor(rnd() * 4);
      const x = e === 0 ? -0.06 * W : e === 1 ? 1.06 * W : rnd() * W;
      const y = e === 2 ? -0.06 * H : e === 3 ? 1.06 * H : rnd() * H;
      friends.push({
        x, y, heading: Math.atan2(H / 2 - y, W / 2 - x), turn: 0, bank: 0, speed: 0.16 * S,
        rel: 0.45 + rnd() * 0.25, size: bird.size * 0.5, ang: rnd() * TAU, spin: rnd() < 0.5 ? 1 : -1,
        role: "join", timer: 2.5 + rnd() * 3, life: 15 + rnd() * 25, beat: 0.34 + rnd() * 0.2,
        ph: rnd() * 6, rest: 0, off: rnd() * 9, edge: e, frame: 0, shown: null
      });
    }
  }

  function stepFriend(f, dt, wk) {
    const b = bird, S = G.S, W = G.W, H = G.H, rnd = G.rnd, t = G.t;
    f.life -= dt; f.timer -= dt; f.rest -= dt;
    if (f.life <= 0 && f.role !== "leave") { f.role = "leave"; f.edge = Math.floor(rnd() * 4); }
    let tx, ty;
    const r = (0.085 + 0.045 * Math.sin(t * 0.4 + f.off)) * S;
    if (f.role === "leave") {
      tx = f.edge === 0 ? -0.4 * W : f.edge === 1 ? 1.4 * W : b.x + (rnd() - 0.5) * S;
      ty = f.edge === 2 ? -0.4 * H : f.edge === 3 ? 1.4 * H : b.y + (rnd() - 0.5) * S;
    } else {
      if (f.timer <= 0) {
        f.role = ["orbit", "cross", "chase", "orbit"][Math.floor(rnd() * 4)];
        f.timer = 3 + rnd() * 5; f.spin = rnd() < 0.5 ? 1 : -1;
        if (rnd() < 0.35) f.rest = 0.6 + rnd() * 1.2;
      }
      if (f.role === "cross") {
        f.ang += f.spin * dt * 0.8;
        tx = b.x - Math.cos(b.heading) * r * 0.35 + Math.cos(b.heading + Math.PI / 2) * Math.sin(f.ang) * r * 1.9;
        ty = b.y - Math.sin(b.heading) * r * 0.35 + Math.sin(b.heading + Math.PI / 2) * Math.sin(f.ang) * r * 1.9;
      } else if (f.role === "chase") {
        tx = b.x - Math.cos(b.heading) * r * 1.15 + noise(t * 0.6, f.off | 0) * r * 0.3;
        ty = b.y - Math.sin(b.heading) * r * 1.15 + noise(t * 0.5, (f.off | 0) + 20) * r * 0.3;
      } else {
        f.ang += f.spin * dt * (f.role === "join" ? 0.5 : 1.0);
        tx = b.x + Math.cos(f.ang) * r;
        ty = b.y + Math.sin(f.ang) * r * 0.72;
      }
    }
    let diff = Math.atan2(ty - f.y, tx - f.x) - f.heading;
    diff = Math.atan2(Math.sin(diff), Math.cos(diff));
    f.turn = clamp(diff * 2.8, -2.6, 2.6);
    f.heading += f.turn * dt;
    f.bank = lerp(f.bank, clamp(f.turn * 0.4, -0.85, 0.85), 1 - Math.exp(-7 * dt));
    const d = Math.hypot(tx - f.x, ty - f.y);
    f.speed = lerp(f.speed, clamp(0.05 * S + d * 0.9, 0.08 * S, 0.5 * S), 1 - Math.exp(-2.5 * dt));
    f.size = lerp(f.size, Math.min(0.92, b.size * f.rel), 1 - Math.exp(-0.7 * dt));
    f.x += Math.cos(f.heading) * f.speed * (0.45 + f.size) * dt + G.wind.x * 0.012 * S * (0.4 + f.size) * wk * dt;
    f.y += Math.sin(f.heading) * f.speed * (0.45 + f.size) * dt + G.wind.y * 0.012 * S * (0.4 + f.size) * wk * dt;
    f.ph += dt / f.beat;
    f.frame = f.rest > 0 ? FLAT : BEAT[Math.floor(f.ph * 6) % 6];
    return !(f.role === "leave" && (f.x < -0.22 * W || f.x > 1.22 * W || f.y < -0.22 * H || f.y > 1.22 * H));
  }

  /* STEP */

  function step(dt) {
    const b = bird, t = G.t, S = G.S, W = G.W, H = G.H, rnd = G.rnd;
    const wk = G.T && G.T.windK ? G.T.windK : 1;
    b.timer -= dt; b.age += dt; b.since += dt;
    const u = clamp(1 - b.timer / b.span, 0, 1), i = Math.floor(b.age * 12);
    let push = 1;
    if (b.mode === "soar") {
      b.turn = b.dir * (TAU / 15) + 0.2 * noise(t * 0.5, 5);
      b.bank = b.dir * 0.42 + 0.1 * noise(t * 0.8, 6);
      b.speed = 0.10 * S; b.frame = 0;
      if (b.timer < 0) enter(pick());
    } else if (b.mode === "glide") {
      b.turn = 0.14 * noise(t * 0.35, 7);
      b.bank = 0.13 * noise(t * 0.6, 8);
      b.speed = 0.135 * S; b.frame = FLAT;
      if (b.timer < 0) enter(pick());
    } else if (b.mode === "flap") {
      b.turn = 0.06 * noise(t * 0.7, 15);
      b.bank = 0.07 * noise(t * 0.9, 16);
      const beating = i < b.beats * 6;
      b.speed = S * (0.12 + 0.13 * Math.min(1, b.age / (b.beats * 0.5)));
      b.frame = beating ? BEAT[i % 6] : FLAT;
      if (b.timer < 0) enter("glide");
    } else if (b.mode === "drift") {
      const into = Math.atan2(-G.wind.y, -G.wind.x);
      let diff = into - b.heading;
      diff = Math.atan2(Math.sin(diff), Math.cos(diff));
      push = 2.4;
      if (u < 0.7) {
        b.turn = clamp(diff * 1.5, -0.9, 0.9);
        b.bank = lerp(b.bank, clamp(diff * 0.35, -0.4, 0.4), 1 - Math.exp(-3 * dt));
        b.speed = S * (0.10 - 0.055 * Math.min(1, u / 0.4));
        b.frame = i % 24 < 6 ? BEAT[i % 6] : FLAT;
      } else {
        b.turn = b.dir * 1.15; b.bank = lerp(b.bank, b.dir * 0.7, 1 - Math.exp(-5 * dt));
        b.speed = S * (0.055 + 0.1 * (u - 0.7) / 0.3); b.frame = BEAT[i % 6];
      }
      if (b.timer < 0) enter(pick());
    } else if (b.mode === "roam") {
      const s = Math.sin(u * TAU * 1.6 + 0.4);
      b.turn = b.dir * 0.42 * s + 0.1 * noise(t * 0.5, 17);
      b.bank = lerp(b.bank, b.dir * 0.55 * s, 1 - Math.exp(-4 * dt));
      b.speed = 0.12 * S;
      b.frame = i % 40 < 6 ? BEAT[i % 6] : FLAT;
      if (b.timer < 0) enter(pick());
    } else if (b.mode === "tumble") {
      if (b.age < 1.1) {
        b.roll = TAU * (b.age / 1.1);
        b.bank = 0.95 * Math.sin(b.roll);
        b.flip = Math.cos(b.roll) < 0 ? -1 : 1;
        b.turn = b.dir * 0.5 * Math.sin(b.roll);
        b.frame = BEAT[(i + 2) % 6];
      } else {
        const k = Math.exp(-2.2 * (b.age - 1.1));
        b.roll = 0; b.flip = 1;
        b.bank = 0.55 * k * Math.sin((b.age - 1.1) * 9);
        b.turn = b.dir * 0.35 * k * Math.sin((b.age - 1.1) * 7);
        b.frame = k > 0.4 ? BEAT[i % 6] : FLAT;
      }
      b.speed = 0.125 * S;
      if (b.timer < 0) enter(pick());
    } else if (b.mode === "dive") {
      b.turn = 0.12 * noise(t * 0.8, 18); b.bank = lerp(b.bank, 0.1 * noise(t * 1.1, 19), 1 - Math.exp(-4 * dt));
      b.speed = S * (0.16 + 0.55 * u);
      b.frame = b.age < 0.2 ? FOLD : (i % 13 === 9 ? 2 : FOLD);
      if (b.timer < 0) enter(b.size > 1.3 && rnd() < 0.4 ? "away" : "pull");
    } else if (b.mode === "away") {
      b.turn = 0; b.bank *= 0.9; b.speed = S * 0.75; b.frame = FOLD;
      const out = b.x < -0.2 * W || b.x > 1.2 * W || b.y < -0.2 * H || b.y > 1.2 * H;
      if (out || b.timer < 0) {
        const e = Math.floor(rnd() * 4);
        b.x = e === 0 ? 0.03 * W : e === 1 ? 0.97 * W : rnd() * W;
        b.y = e === 2 ? 0.04 * H : e === 3 ? 0.96 * H : rnd() * H;
        b.heading = Math.atan2(H / 2 - b.y, W / 2 - b.x);
        b.size = 0.42; b.bank = 0;
        enter("flap");
      }
    } else if (b.mode === "pull") {
      let diff = b.aim - b.heading;
      diff = Math.atan2(Math.sin(diff), Math.cos(diff));
      b.turn = clamp(diff * 1.6, -1.6, 1.6) * (1 - 0.6 * u);
      b.bank = lerp(b.bank, clamp(diff * 0.6, -0.8, 0.8), 1 - Math.exp(-4 * dt));
      b.speed = S * (0.6 - 0.46 * u);
      b.frame = b.age < 1.4 ? BRAKES[i % 4] : (i % 18 < 6 ? BEAT[i % 6] : FLAT);
      if (b.timer < 0) enter("glide");
    }

    /* KEEP */

    b.size += clamp(b.goal - b.size, -b.rate * dt, b.rate * dt);
    if (b.mode === "soar") b.goal = Math.max(0.34, b.goal - 0.004 * dt);
    if (b.mode !== "dive" && b.mode !== "away") {
      const cx = W / 2 + 0.12 * W * noise(t * 0.02, 9), cy = H / 2 + 0.12 * H * noise(t * 0.02, 10);
      const dx = cx - b.x, dy = cy - b.y, dist = Math.hypot(dx, dy), limit = 0.3 * S;
      if (dist > limit) {
        let diff = Math.atan2(dy, dx) - b.heading;
        diff = Math.atan2(Math.sin(diff), Math.cos(diff));
        b.turn += diff * 1.4 * b.hold * Math.min(1.5, (dist - limit) / limit);
      }
      const mx = 0.1 * W + 0.17 * S * b.size, my = 0.09 * H + 0.17 * S * b.size;
      let ex = 0, ey = 0;
      if (b.x < mx) ex += (mx - b.x) / mx;
      if (b.x > W - mx) ex -= (b.x - W + mx) / mx;
      if (b.y < my) ey += (my - b.y) / my;
      if (b.y > H - my) ey -= (b.y - H + my) / my;
      if (ex || ey) {
        let diff = Math.atan2(ey, ex) - b.heading;
        diff = Math.atan2(Math.sin(diff), Math.cos(diff));
        b.turn += diff * 2.6 * Math.min(1.4, Math.hypot(ex, ey));
      }
    }
    b.heading += b.turn * dt;
    const drag = 0.013 * S * (0.45 + 0.85 * b.size) * push, wc = 0.45 * b.speed * b.size;
    let wx = G.wind.x * drag, wy = G.wind.y * drag;
    const wm = Math.hypot(wx, wy);
    if (wm > wc) { wx *= wc / wm; wy *= wc / wm; }
    b.x += Math.cos(b.heading) * b.speed * b.size * dt + wx * dt;
    b.y += Math.sin(b.heading) * b.speed * b.size * dt + wy * dt;
    if (b.mode !== "dive" && b.mode !== "away") { b.x = clamp(b.x, 0.05 * W, 0.95 * W); b.y = clamp(b.y, 0.06 * H, 0.94 * H); }

    /* FRIENDS */

    if (opt.friends === undefined || opt.friends > 0) {
      meet -= dt;
      if (meet <= 0 && !friends.length) {
        spawn(opt.friends !== undefined ? opt.friends : (rnd() < 0.55 ? 1 : 2));
        meet = opt.friends !== undefined ? 25 + rnd() * 20 : 90 + rnd() * 110;
      }
    }
    for (let k = friends.length - 1; k >= 0; k--) if (!stepFriend(friends[k], dt, wk)) friends.splice(k, 1);

    const key = Math.floor(t * 12);
    if (key !== tick) {
      tick = key;
      shown = { x: b.x, y: b.y, heading: b.heading, bank: b.bank, size: b.size, frame: b.frame, flip: b.flip };
      for (let k = 0; k < friends.length; k++) {
        const f = friends[k];
        f.shown = { x: f.x, y: f.y, heading: f.heading, bank: f.bank, size: f.size, frame: f.frame, flip: 1 };
      }
    }
  }

  /* PAINT */

  function one(s) {
    const { ctx, S } = G, size = S * 0.3 * s.size;
    ctx.save();
    ctx.translate(s.x, s.y);
    ctx.rotate(s.heading);
    ctx.scale(1, s.flip);
    ctx.transform(1, 0, 0.22 * Math.sin(s.bank), Math.cos(s.bank), 0, 0);
    ctx.scale(size, size);
    ctx.fill(frames[s.frame]);
    ctx.restore();
  }

  function draw() {
    const { ctx, T } = G;
    if (!shown) return;
    ctx.fillStyle = T.bird;
    for (let k = 0; k < friends.length; k++) if (friends[k].shown) one(friends[k].shown);
    one(shown);
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
      if (e.key === "f" && !friends.length) spawn(1 + Math.floor(G.rnd() * 2));
    });
  }

  return { build, step, draw, dive, init, bird, friends };
})();
