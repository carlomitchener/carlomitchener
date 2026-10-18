const Splash = (() => {
  const { TAU, clamp, lerp, smooth, mix, noise } = Core;
  const host = document.querySelector("#splash");
  const q = new URLSearchParams(location.search);
  const IDLE = TAU / 40, WIND = TAU * 0.8, HOLD = 0.75, SPRING = 26, SPRINGZ = 0.3, POP = 24, POPZ = 0.5;
  const FLY = 0.5, MORPH = 1.5, END = FLY + MORPH, BEAT = 0.5, SIZE = 0.95, RAMP = 16, RAMPT = 0.6;
  const STEP = BIRD.fringe.step, LIGHT = (BIRD.fringe.angle * Math.PI) / 180, HEIGHT = BIRD.bird.height, START = (BIRD.gradient.start * Math.PI) / 180;
  const [GX, GY] = BIRD.gradient.center, [BX, BY] = BIRD.bird.center, WIDTH = Avatar.width(BIRD);
  const BASE = Avatar.flatten(BIRD.outline.cubics, 6), OUTLINE = Avatar.cubicPath(BIRD), REST = [0, 0, 0];
  const RING = BIRD.fringe.colors.map((n) => Avatar.hexOf(PALETTE, n));
  const STOPS = [BIRD.gradient.colors[0], ...BIRD.gradient.colors.slice(1).reverse(), BIRD.gradient.colors[0]].map((n) => Avatar.hexOf(PALETTE, n));
  const REACH = Math.max(...BIRD.glow.map((g) => (g.radius || 0) + 2 * g.sigma));
  const root = document.documentElement;
  const scheme = matchMedia("(prefers-color-scheme: dark)");
  const tone = () => Avatar.hexOf(PALETTE, BIRD.themes[scheme.matches ? "dark" : "light"].bird);
  const deg = (r) => (r * 180) / Math.PI;

  const quiet = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const mode = q.get("splash") || (quiet ? "off" : "full");
  if (!host || mode === "off") { if (host) host.remove(); return null; }

  /* DOM */

  const glow = document.createElement("div"), dust = document.createElement("canvas"), ink = document.createElement("canvas"), hint = document.createElement("p");
  glow.className = "glow"; dust.className = "dust"; ink.className = "ink"; hint.className = "hint"; hint.textContent = "press and hold";
  host.append(glow, dust, ink, hint);
  const ctx = ink.getContext("2d"), veil = new Image();
  glow.style.setProperty("--stops", STOPS.join(", "));

  let W = 0, H = 0, M = 0, u = 0, R = 0, DPR = 1;

  function mask(r) {
    const k = 1024 / (2 * r), px = (v) => (v * k).toFixed(3), ox = r - GX, oy = r - GY;
    const layers = BIRD.glow.map((g, i) => {
      const [cx, cy] = g.center || BIRD.gradient.center;
      const shape = g.shape === "disc" ? `<circle cx="${px(cx + ox)}" cy="${px(cy + oy)}" r="${px(g.radius)}"/>` : `<use href="#b" transform="matrix(${k} 0 0 ${k} ${px(ox)} ${px(oy)})"/>`;
      return `<filter id="f${i}" filterUnits="userSpaceOnUse" x="0" y="0" width="1024" height="1024"><feGaussianBlur stdDeviation="${px(g.sigma)}"/></filter><g filter="url(#f${i})">${shape}</g>`;
    });
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024" fill="#fff"><defs><path id="b" d="${OUTLINE}"/></defs>${layers.join("")}</svg>`;
    return `data:image/svg+xml,${encodeURIComponent(svg)}`;
  }

  function resize() {
    W = innerWidth; H = innerHeight; M = Math.min(W, H); DPR = Math.min(2, devicePixelRatio || 1);
    u = (0.92 * M) / BIRD.canvas;
    R = Math.hypot(W, H) / 2 + 48;
    ink.width = dust.width = Math.round(W * DPR); ink.height = dust.height = Math.round(H * DPR);
    Object.assign(glow.style, { left: `${W / 2 - R}px`, top: `${H / 2 - R}px`, width: `${2 * R}px`, height: `${2 * R}px` });
    const url = mask(R / u);
    veil.src = url;
    glow.style.webkitMaskImage = glow.style.maskImage = `url("${url}")`;
  }

  /* BIRD */

  function shape(p) {
    const path = new Path2D();
    Avatar.deform(BASE, { flap: p[0], bend: p[1], sweep: p[2] }, BIRD.rig).forEach(([x, y], i) => (i ? path.lineTo(x - WIDTH / 2, y - 0.5) : path.moveTo(x - WIDTH / 2, y - 0.5)));
    path.closePath();
    return path;
  }

  const STILL = shape(REST);

  function beat(t) {
    const P = Bird.POSES, k = 1.5 - 1.5 * Math.cos((TAU * t) / BEAT), i = Math.min(2, Math.floor(k)), f = k - i;
    return P[i].map((v, j) => lerp(v, P[i + 1][j], f));
  }

  function paint(path, x, y, h, rot, color) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(h, h); ctx.fillStyle = color; ctx.fill(path); ctx.restore();
  }

  function draw({ pose = REST, x, y, h, rot = 0, depth = 0, squeeze = 0, color = tone() }) {
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    ctx.clearRect(0, 0, W, H);
    const path = pose.some((v) => v) ? shape(pose) : STILL;
    const k = (STEP / HEIGHT) * h * (1 - squeeze), lx = Math.cos(LIGHT), ly = -Math.sin(LIGHT), n = RING.length;
    const top = depth * n, at = (i) => top + ((i + 1) / n) * (n - top);
    if (squeeze < 1) for (let i = n - 1; i >= 0; i--) paint(path, x - at(i) * k * lx, y - at(i) * k * ly, h, rot, RING[i]);
    paint(path, x - top * k * lx, y - top * k * ly, h, rot, color);
  }

  function clear() { ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, ink.width, ink.height); }

  function blend(a, b, e) {
    return { x: lerp(a.x, b.x, e), y: lerp(a.y, b.y, e), h: lerp(a.h, b.h, e), rot: lerp(a.rot, b.rot, e), color: mix(a.color, b.color, e), squeeze: lerp(a.squeeze, b.squeeze, e) };
  }

  /* STATES */

  function logo() {
    return { x: W / 2 + (BX - GX) * u, y: H / 2 + (BY - GY) * u, h: HEIGHT * u, rot: 0, color: tone(), squeeze: 0 };
  }

  function lift() {
    return { x: W * 0.5, y: H * 0.47, h: 1.04 * M * 0.3 * SIZE, rot: -0.35, color: (G.T && G.T.bird) || tone(), squeeze: 1 };
  }

  function lens(t) {
    return { rot: 0.018 * noise(t * 0.05, 11), zoom: 1.04 + 0.012 * noise(t * 0.04, 13), ox: 0.01 * G.W * noise(t * 0.045, 12), oy: 0.01 * G.H * noise(t * 0.05, 14) };
  }

  function sky() {
    const b = Bird.bird, { W: SW, H: SH, S, t } = G, box = G.canvas.getBoundingClientRect(), { rot, zoom, ox, oy } = lens(t);
    const px = b.x - SW / 2 + ox, py = b.y - SH / 2 + oy, c = Math.cos(rot), s = Math.sin(rot);
    return { x: box.left + SW / 2 + zoom * (c * px - s * py), y: box.top + SH / 2 + zoom * (s * px + c * py), h: zoom * S * 0.3 * b.size, rot: b.heading + rot, color: G.T.bird, squeeze: 1, pose: Bird.POSES[b.frame] };
  }

  function handoff(o, fly) {
    const { W: SW, H: SH, S, t } = G, box = G.canvas.getBoundingClientRect(), { rot, zoom, ox, oy } = lens(t);
    const px = o.x - box.left - SW / 2, py = o.y - box.top - SH / 2, c = Math.cos(rot), s = Math.sin(rot), b = Bird.bird;
    Bird.enter(fly);
    b.x = (c * px + s * py) / zoom + SW / 2 - ox; b.y = (-s * px + c * py) / zoom + SH / 2 - oy;
    b.heading = o.rot - rot; b.size = o.h / (zoom * S * 0.3); b.bank = 0; b.turn = 0;
    if (fly === "flap") { b.goal = 0.7; b.rate = 0.1; }
  }

  /* DUST */

  const VERT = `#version 300 es
precision highp float;
uniform vec2 uRes, uC;
uniform float uG, uT, uW, uA, uTr, uR;
uniform int uCols;
uniform sampler2D uTex;
out vec4 vCol;
float h1(float n) { return fract(sin(n) * 43758.5453); }
float h2(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float vn(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(h2(i), h2(i + vec2(1, 0)), f.x), mix(h2(i + vec2(0, 1)), h2(i + vec2(1, 1)), f.x), f.y); }
float rate(float t) { return uW + uA * min(t, uTr); }
float turn(float t) { float m = min(t, uTr); return uW * t + 0.5 * uA * m * m + uA * uTr * max(t - uTr, 0.0); }
mat2 rot(float a) { float c = cos(a), s = sin(a); return mat2(c, s, -s, c); }
void main() {
  int id = gl_InstanceID, v = gl_VertexID;
  vec2 p0 = (vec2(float(id % uCols), float(id / uCols)) + 0.5) * uG, q = p0 - uC;
  vec4 tx = texture(uTex, p0 / uRes);
  if (tx.a < 0.004) { gl_Position = vec4(2.0, 2.0, 2.0, 1.0); vCol = vec4(0.0); return; }
  float r = min(length(q) / uR, 1.0), f = float(id);
  float a = h1(f * 0.6180 + 1.3), b = h1(f * 1.3703 + 7.1), c = h1(f * 2.1101 + 3.7);
  float clump = 0.6 * vn(p0 * 0.016) + 0.4 * vn(p0 * 0.06);
  float td = 0.04 + 0.92 * pow(1.0 - r, 1.2) * (0.45 + 0.55 * clump) + 0.06 * a;
  float life = 0.5 + 0.45 * b, size = uG, alpha = 1.0, t = uT, len = uG;
  vec2 pos, ax;
  if (t < td) {
    float th = turn(t);
    pos = uC + rot(th) * q;
    ax = vec2(cos(th), sin(th));
  } else {
    vec2 qd = rot(turn(td)) * q, tg = vec2(-qd.y, qd.x);
    float dt = t - td, k = 2.4 + 2.6 * b, speed = max(rate(td) * length(q), 300.0 + 420.0 * a), e = exp(-k * dt);
    vec2 dir = normalize(tg + 1e-3) + normalize(qd + 1e-3) * (0.15 + 0.3 * c);
    dir = rot((a - 0.5) * 0.4) * normalize(dir);
    pos = uC + qd + dir * speed * (1.0 - e) / k;
    float age = clamp(dt / life, 0.0, 1.0);
    size *= mix(1.0, 1.15 + 0.35 * c, smoothstep(0.0, 0.1, dt)) * mix(1.0, 0.5, age);
    len = max(size, speed * e * 0.024);
    ax = dir;
    alpha = (1.0 - smoothstep(0.25, 1.0, age)) * sqrt(size / len);
  }
  vec2 ay = vec2(-ax.y, ax.x);
  vec2 corner = vec2((v == 1 || v == 2 || v == 4) ? 0.5 : -0.5, (v == 2 || v == 4 || v == 5) ? 0.5 : -0.5);
  vec2 p = pos + ax * (corner.x * len - 0.5 * (len - size)) + ay * corner.y * size;
  vec3 col = tx.rgb * mix(1.0, 0.94 + 0.12 * a, smoothstep(0.0, 0.25, t));
  alpha *= tx.a;
  vCol = vec4(col * alpha, alpha);
  gl_Position = vec4(p.x / uRes.x * 2.0 - 1.0, 1.0 - p.y / uRes.y * 2.0, 0.0, 1.0);
}`;

  const FRAG = `#version 300 es
precision mediump float;
in vec4 vCol;
out vec4 o;
void main() { o = vCol; }`;

  const Dust = (() => {
    let gl = null, prog = null, tex = null, U = {}, count = 0, cols = 0, grain = 2, spin0 = 0;

    function setup() {
      gl = dust.getContext("webgl2", { alpha: true, premultipliedAlpha: true, antialias: false });
      if (!gl) return false;
      const part = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; };
      prog = gl.createProgram();
      gl.attachShader(prog, part(gl.VERTEX_SHADER, VERT));
      gl.attachShader(prog, part(gl.FRAGMENT_SHADER, FRAG));
      gl.linkProgram(prog);
      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
      for (const k of ["uRes", "uC", "uG", "uT", "uW", "uA", "uTr", "uR", "uCols", "uTex"]) U[k] = gl.getUniformLocation(prog, k);
      tex = gl.createTexture();
      return true;
    }

    function canvas(spin) {
      const c = document.createElement("canvas");
      c.width = W; c.height = H;
      const g = c.getContext("2d"), cone = g.createConicGradient(spin - START, W / 2, H / 2);
      STOPS.forEach((hex, i) => cone.addColorStop(i / (STOPS.length - 1), hex));
      g.fillStyle = cone; g.fillRect(0, 0, W, H);
      g.globalCompositeOperation = "destination-in";
      g.drawImage(veil, W / 2 - R, H / 2 - R, 2 * R, 2 * R);
      return c;
    }

    function start(spin, speed) {
      try { if (!gl && !setup()) return false; } catch (e) { console.error(e); gl = null; return false; }
      if (gl.isContextLost() || !veil.complete || !veil.naturalWidth) return false;
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, canvas(spin));
      grain = Math.max(2, Math.sqrt((W * H) / 600000));
      cols = Math.ceil(W / grain);
      count = cols * Math.ceil(H / grain);
      spin0 = speed;
      return true;
    }

    function wipe() {
      if (!gl) return;
      gl.viewport(0, 0, dust.width, dust.height);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
    }

    function render(t) {
      wipe();
      gl.useProgram(prog);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.uniform1i(U.uTex, 0);
      gl.uniform2f(U.uRes, W, H);
      gl.uniform2f(U.uC, W / 2, H / 2);
      gl.uniform1f(U.uG, grain);
      gl.uniform1f(U.uT, t);
      gl.uniform1f(U.uW, spin0);
      gl.uniform1f(U.uA, RAMP);
      gl.uniform1f(U.uTr, RAMPT);
      gl.uniform1f(U.uR, REACH * u);
      gl.uniform1i(U.uCols, cols);
      gl.drawArraysInstanced(gl.TRIANGLES, 0, 6, count);
    }

    return { start, render, wipe };
  })();

  /* PHASES */

  let phase = "lock", clock = 0, last = performance.now(), turn = 0, rate = IDLE, depth = 0, pull = 0, press = 0, held = false, idle = 0, flung = false, from = null;

  function lock(dt) {
    idle += dt;
    hint.classList.toggle("on", !held && idle > 2.4);
    if (held) {
      press = Math.min(1, press + dt / HOLD);
      depth = 1 - (1 - press) ** 2; pull = 0;
    } else {
      pull += (-SPRING * SPRING * depth - 2 * SPRINGZ * SPRING * pull) * dt;
      depth += pull * dt;
      press = depth > 0 ? 1 - Math.sqrt(Math.max(0, 1 - depth)) : 0;
    }
    rate = IDLE + WIND * Math.max(0, depth) ** 2;
    turn += rate * dt;
    tint(turn, 1);
    if (press >= 1) launch();
  }

  function tint(spin, alpha) {
    glow.style.setProperty("--a", `${(90 - deg(START) + deg(spin)).toFixed(2)}deg`);
    glow.style.opacity = alpha.toFixed(3);
  }

  function launch() {
    phase = "fly"; clock = 0; depth = 1; pull = 0;
    hint.classList.remove("on");
    flung = Dust.start(turn, rate);
    if (flung) glow.style.opacity = "0";
    host.classList.add("fly");
    Sky.resume();
  }

  function fade(t) {
    if (flung) return host.style.setProperty("--veil", (1 - smooth(t / 0.8)).toFixed(3));
    const k = clamp(t / END, 0, 1);
    host.style.setProperty("--veil", (1 - smooth((k - 0.2) / 0.6)).toFixed(3));
    tint(turn, 1 - smooth(k / 0.5));
  }

  function fly(dt) {
    pull += (-POP * POP * depth - 2 * POPZ * POP * pull) * dt;
    depth += pull * dt;
    fade(clock);
  }

  function rising() {
    const k = clamp((clock - FLY) / MORPH, 0, 1), e = smooth(k), wings = clock - FLY - (MORPH - 2 * BEAT);
    const amp = wings > 0 ? smooth(wings / 0.3) : 0, s = blend(logo(), lift(), e);
    return { ...s, depth, squeeze: smooth(k / 0.4), pose: amp ? beat(wings).map((p) => p * amp) : REST };
  }

  function returning() {
    const k = clamp((clock - 0.3) / MORPH, 0, 1), e = smooth(k), amp = 1 - smooth(k / 0.8), s = blend(from, logo(), e);
    return { ...s, squeeze: 1 - smooth((clock - (END - 0.22)) / 0.22), pose: amp ? beat(clock).map((p) => p * amp) : REST };
  }

  function done() {
    phase = "open";
    Sky.skip.bird = false; G.visible = true;
    Dust.wipe(); clear();
    host.classList.remove("fly"); host.classList.add("open");
    host.style.setProperty("--veil", "0");
    root.classList.remove("splashing");
    dispatchEvent(new Event("splashdone"));
  }

  function relock() {
    if (phase !== "open") return;
    scrollTo({ top: 0, behavior: "instant" });
    from = sky();
    phase = "back"; clock = 0;
    root.classList.add("splashing");
    host.classList.remove("open"); host.classList.add("fly");
    Sky.skip.bird = true; G.visible = false;
    flung = Dust.start(turn, IDLE + WIND);
    dispatchEvent(new Event("splashlock"));
  }

  function settle() {
    phase = "lock"; clock = 0; idle = 0; depth = 0; pull = -7; press = 0; held = false;
    host.classList.remove("fly");
    host.style.setProperty("--veil", "1");
    Dust.wipe();
    tint(turn, 1);
    Sky.pause();
  }

  function finish() {
    if (phase !== "lock") return;
    Sky.resume(); done();
  }

  function advance(dt) {
    clock += dt;
    if (phase === "lock") lock(dt);
    else if (phase === "fly") fly(dt);
    else if (phase === "back") fade(Math.max(0, END - clock));
  }

  function show() {
    if (phase === "lock") return draw({ ...logo(), depth });
    if (phase === "fly") {
      if (flung) Dust.render(clock);
      const o = rising();
      draw(o);
      if (clock >= END) { phase = "hand"; handoff(o, "flap"); setTimeout(done, 110); }
    } else if (phase === "back") {
      if (flung) Dust.render(Math.max(0, END - clock));
      draw(returning());
      if (clock >= END) settle();
    }
  }

  function frame(now) {
    const dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
    last = now;
    try { advance(dt); show(); } catch (e) { console.error(e); return bail(); }
    if (phase !== "open" && phase !== "hand") requestAnimationFrame(frame);
  }

  function bail() {
    phase = "open";
    Sky.skip.bird = false; G.visible = true;
    root.classList.remove("splashing");
    host.remove();
    Sky.resume();
    dispatchEvent(new Event("splashdone"));
  }

  function run() { last = performance.now(); requestAnimationFrame(frame); }

  /* RELOCK */

  addEventListener("click", (e) => {
    if (phase !== "open" || e.target !== G.canvas) return;
    relock(); run();
  });

  /* INPUT */

  function hold(on) {
    if (phase !== "lock") return;
    held = on; idle = 0;
  }

  host.addEventListener("pointerdown", (e) => { if (phase === "lock") { host.setPointerCapture(e.pointerId); hold(true); } });
  host.addEventListener("pointerup", () => hold(false));
  host.addEventListener("pointercancel", () => hold(false));
  host.addEventListener("contextmenu", (e) => e.preventDefault());

  function key(e) {
    if (phase !== "lock") return;
    if (e.key === "Escape" && e.type === "keydown") { e.preventDefault(); finish(); }
    else if (e.key === "Enter" || e.key === " ") { e.preventDefault(); if (!e.repeat) hold(e.type === "keydown"); }
  }

  let queued = 0;
  function queue() { cancelAnimationFrame(queued); queued = requestAnimationFrame(resize); }

  /* HOOKS */

  root.classList.add("splashing");
  host.tabIndex = 0; host.setAttribute("role", "button"); host.setAttribute("aria-label", "Press and hold to enter");
  G.visible = false; Sky.skip.bird = true;
  Sky.pause();
  resize();
  host.focus({ preventScroll: true });
  addEventListener("resize", queue);
  addEventListener("keydown", key);
  addEventListener("keyup", key);
  if (q.get("at")) {
    veil.decode().then(() => {
      const end = +q.get("at");
      held = true;
      while (phase === "lock") advance(1 / 60);
      for (let s = 0; s < end && phase === "fly"; s += 1 / 60) advance(1 / 60);
      Sky.pause(); Sky.jump(FLY + end);
      if (flung) Dust.render(clock);
      draw(rising());
    });
  } else run();
  return { finish, relock: () => { relock(); if (phase === "back") run(); } };
})();
