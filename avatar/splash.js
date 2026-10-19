const Splash = (() => {
  const { TAU, clamp, lerp, smooth, mix, noise, parse } = Core;
  const host = document.querySelector("#splash");
  const q = new URLSearchParams(location.search);
  const IDLE = TAU / 40, WIND = TAU * 0.7, HOLD = 0.75, SPRING = 26, SPRINGZ = 0.3, POP = 24, POPZ = 0.5, BREATH = TAU / 7.5, BOOST = 0.45, LIFT = 0.018;
  const FLY = 0.5, MORPH = 1.5, END = FLY + MORPH, BEAT = 0.5, SIZE = 0.95, TRAIL = 4.2, VEIL = 1.4, GUST = 0.34;
  const STEP = BIRD.fringe.step, LIGHT = (BIRD.fringe.angle * Math.PI) / 180, HEIGHT = BIRD.bird.height, START = (BIRD.gradient.start * Math.PI) / 180;
  const [GX, GY] = BIRD.gradient.center, [BX, BY] = BIRD.bird.center, WIDTH = Avatar.width(BIRD);
  const BASE = Avatar.flatten(BIRD.outline.cubics, 6), OUTLINE = Avatar.cubicPath(BIRD), REST = [0, 0, 0];
  const RING = BIRD.fringe.colors.map((n) => Avatar.hexOf(PALETTE, n));
  const STOPS = [BIRD.gradient.colors[0], ...BIRD.gradient.colors.slice(1).reverse(), BIRD.gradient.colors[0]].map((n) => Avatar.hexOf(PALETTE, n));
  const RGB = new Float32Array(STOPS.flatMap((h) => parse(h).map((v) => v / 255)));
  const REACH = Math.max(...BIRD.glow.map((g) => (g.radius || 0) + 2 * g.sigma));
  const root = document.documentElement;
  const scheme = matchMedia("(prefers-color-scheme: dark)");
  const tone = () => Avatar.hexOf(PALETTE, BIRD.themes[scheme.matches ? "dark" : "light"].bird);
  const deg = (r) => (r * 180) / Math.PI;

  const quiet = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const mode = q.get("splash") || (quiet ? "off" : "full");
  if (!host || mode === "off") { if (host) host.remove(); return null; }

  /* DOM */

  const make = (tag, name) => Object.assign(document.createElement(tag), { className: name });
  const glow = make("div", "glow"), dust = make("canvas", "dust"), ink = make("canvas", "ink"), hint = make("p", "hint");
  hint.textContent = "press and hold";
  host.append(glow, dust, ink, hint);
  const ctx = ink.getContext("2d"), veil = new Image();
  glow.style.setProperty("--stops", STOPS.join(", "));

  let W = 0, H = 0, M = 0, u = 0, R = 0, DPR = 1, drawn = "";

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
    drawn = "";
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
    const key = [x, y, h, rot, depth, squeeze, ...pose].map((v) => v.toFixed(3)).join() + color;
    if (key === drawn) return;
    drawn = key;
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    ctx.clearRect(0, 0, W, H);
    const path = pose.some((v) => v) ? shape(pose) : STILL;
    const k = (STEP / HEIGHT) * h * (1 - squeeze), lx = Math.cos(LIGHT), ly = -Math.sin(LIGHT), n = RING.length;
    const top = depth * n, at = (i) => top + ((i + 1) / n) * (n - top);
    if (squeeze < 1) for (let i = n - 1; i >= 0; i--) paint(path, x - at(i) * k * lx, y - at(i) * k * ly, h, rot, RING[i]);
    paint(path, x - top * k * lx, y - top * k * ly, h, rot, color);
  }

  function clear() { drawn = ""; ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, ink.width, ink.height); }

  function blend(a, b, e) {
    return { x: lerp(a.x, b.x, e), y: lerp(a.y, b.y, e), h: lerp(a.h, b.h, e), rot: lerp(a.rot, b.rot, e), color: mix(a.color, b.color, e), squeeze: lerp(a.squeeze, b.squeeze, e) };
  }

  /* STATES */

  function logo(k = 0) {
    return { x: W / 2 + (BX - GX) * u, y: H / 2 + (BY - GY) * u, h: HEIGHT * u * (1 + LIFT * k), rot: 0, color: tone(), squeeze: 0 };
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
    return { x: box.left + SW / 2 + zoom * (c * px - s * py), y: box.top + SH / 2 + zoom * (s * px + c * py), h: zoom * S * 0.3 * b.size, rot: b.heading + rot, color: G.T.bird, squeeze: 1, pose: Bird.pose ? Bird.pose() : Bird.POSES[b.frame] };
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

  const HEAD = `#version 300 es
precision highp float;
precision highp int;
uniform vec2 uRes, uC, uWind;
uniform float uDpr, uT, uSpin0, uW0, uKf, uWm, uSc0, uSc1, uGa, uRm, uRg, uL, uT0, uT1, uDir, uLum, uFlow, uGrain, uDot, uBoost, uDark, uEnv;
uniform vec3 uStops[8], uGround;
uniform sampler2D uMask;
const float TAU = 6.2831853;
uint hu(uint x) { x ^= x >> 16; x *= 0x7feb352du; x ^= x >> 15; x *= 0x846ca68bu; x ^= x >> 16; return x; }
float rn(uint s, uint k) { return float(hu(s + k * 0x9e3779b9u) >> 8) / 16777216.0; }
vec2 hg(ivec2 i) { uint h = hu(uint(i.x) * 0x27d4eb2du + hu(uint(i.y) + 0x165667b1u)); return vec2(float(h & 0xffffu), float(h >> 16)) / 32767.5 - 1.0; }
vec3 gn(vec2 p) {
  vec2 i = floor(p), f = p - i, u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0), du = 30.0 * f * f * (f * (f - 2.0) + 1.0);
  ivec2 k = ivec2(i) + 4096;
  vec2 ga = hg(k), gb = hg(k + ivec2(1, 0)), gc = hg(k + ivec2(0, 1)), gd = hg(k + ivec2(1, 1));
  float va = dot(ga, f), vb = dot(gb, f - vec2(1, 0)), vc = dot(gc, f - vec2(0, 1)), vd = dot(gd, f - vec2(1, 1)), w = va - vb - vc + vd;
  return vec3(va + u.x * (vb - va) + u.y * (vc - va) + u.x * u.y * w, ga + u.x * (gb - ga) + u.y * (gc - ga) + u.x * u.y * (ga - gb - gc + gd) + du * (u.yx * w + vec2(vb, vc) - va));
}
mat2 rot(float a) { float c = cos(a), s = sin(a); return mat2(c, s, -s, c); }
float clump(vec2 p) { return clamp(0.5 + 0.95 * (0.65 * gn(p).x + 0.35 * gn(p * 2.3 + 17.0).x), 0.0, 1.0); }
float rel(vec2 q) { float r = min(length(q) / uRg, 1.0); return uT0 + uT1 * pow(1.0 - r, 1.3) * (0.4 + 0.6 * clump(rot(2.2 * r) * q / uL)); }
float spinAt(float t) { return uSpin0 + uW0 * (1.0 - exp(-uKf * t)) / uKf; }
float scaleAt(float t) { return mix(uSc1, uSc0, exp(-t / 0.45)); }
vec3 hue(float a) { float s = fract(a / TAU) * 7.0; int i = min(int(s), 6); return mix(uStops[i], uStops[i + 1], s - float(i)); }
`;

  const QUAD = `#version 300 es
void main() { gl_Position = vec4(float((gl_VertexID & 1) << 2) - 1.0, float((gl_VertexID & 2) << 1) - 1.0, 0.0, 1.0); }`;

  const FIELD = `${HEAD}
out vec4 o;
void main() {
  vec2 p = vec2(gl_FragCoord.x / uDpr, uRes.y - gl_FragCoord.y / uDpr), d = p - uC, q = d / scaleAt(uT);
  float m = texture(uMask, q / (2.0 * uRm) + 0.5).r, f = uGa * (1.0 - smoothstep(0.0, 0.14, uT - rel(q))), s = m * uBoost * exp(-max(uT, 0.0) / 0.22);
  vec3 h = hue(atan(d.y, d.x) - spinAt(uT)), g = uDark > 0.5 ? min(vec3(1.0), h * (m + s)) : h * s * (1.0 - m) + h * m * (1.0 - s) + s * m * h * h;
  float rv = length(d) / length(0.5 * uRes), v = uT < 0.0 ? 1.0 : 1.0 - smoothstep(0.0, 1.0, (uT - 0.12 - 0.62 * rv - 0.14 * (clump(d / (1.7 * uL) + 9.0) - 0.5)) / 0.42);
  float a = (uDark > 0.5 ? min(1.0, m + s) : m + s - m * s) * f, al = a + v * (1.0 - a);
  vec3 c = g * f + uGround * v * (1.0 - a);
  float n = rn(uint(gl_FragCoord.x) * 1973u + uint(gl_FragCoord.y) * 9277u, 7u) - 0.5;
  o = vec4(c + n * al / 255.0, al);
}`;

  const MOTE = `${HEAD}
out vec4 vCol;
void hide() { gl_Position = vec4(-2.0, -2.0, 0.0, 1.0); gl_PointSize = 0.0; vCol = vec4(0.0); }
float grip(float t) { float x = min(t / 0.7, 1.0); return 0.7 * (x * x * x - 0.5 * x * x * x * x) + max(t - 0.7, 0.0); }
vec2 path(vec2 b, float wm, float kp, float ex, float wk, float t) { return rot(uDir * wm * (1.0 - exp(-kp * t)) / kp) * b * (1.0 + ex * (1.0 - exp(-t / 0.7))) + uDir * uWind * wk * grip(t); }
vec2 flow(vec2 p, float t) { vec2 x = p / (1.3 * uL) + vec2(0.13, -0.05) * t; vec3 a = gn(x), b = gn(x * 2.2 + 31.0 - 0.1 * t); vec2 g = a.yz + 0.5 * b.yz; return vec2(g.y, -g.x); }
void main() {
  uint s = hu(uint(gl_VertexID) + 0x632be5abu);
  float an = TAU * rn(s, 2u);
  vec2 q = uRg * 1.06 * sqrt(rn(s, 1u)) * vec2(cos(an), sin(an));
  float m = texture(uMask, q / (2.0 * uRm) + 0.5).r;
  if (rn(s, 5u) > pow(m, 0.8)) { hide(); return; }
  float td = rel(q) + 0.08 * rn(s, 3u), life = mix(1.6, 3.1, rn(s, 4u)), dt = uT - td;
  if (dt <= 0.0 || dt >= life) { hide(); return; }
  float z = rn(s, 6u), kp = mix(0.8, 2.0, rn(s, 7u)), ex = mix(0.03, 0.3, rn(s, 8u)), wk = mix(0.55, 1.45, z), wm = uWm > 0.0 ? uWm : uW0 * exp(-uKf * td);
  vec2 b = q * scaleAt(td), c = vec2(0.0);
  float h = dt / 5.0;
  for (int k = 0; k < 5; k++) { float e = (float(k) + 0.5) * h; c += uFlow * flow(path(b, wm, kp, ex, wk, e) + uDir * c, td + e) * h * smoothstep(0.0, 0.5, e); }
  vec2 pos = uC + path(b, wm, kp, ex, wk, dt) + uDir * c;
  float age = dt / life, big = step(0.965, rn(s, 9u)), w = rn(s, 10u);
  float sb = min(1.15 * uGrain * pow(max(m, 0.02), -0.4), 4.0 * uGrain), ss = mix(mix(0.8, 2.4, w * w) * mix(0.8, 1.3, z), mix(3.5, 8.0, w), big) * uDot, e = smoothstep(0.05, 0.75, dt);
  float sz = mix(sb, ss, e) * mix(1.0, 0.45, age * age);
  float al = mix(m, min(1.0, 0.5 * m * sb * sb / (ss * ss)) * mix(1.0, 0.25, big), e) * smoothstep(0.0, 0.12, dt) * (1.0 - smoothstep(0.5, 1.0, age)) * mix(0.6, 1.0, z) * uGa * uEnv;
  float tw = step(rn(s, 11u), 0.3) * pow(max(0.0, 0.5 + 0.5 * sin(TAU * rn(s, 12u) + uT * mix(4.0, 10.0, rn(s, 13u)))), 10.0);
  vec3 col = mix(hue(atan(q.y, q.x) - spinAt(td) + 0.3 * (rn(s, 14u) - 0.5)), vec3(1.0), 0.15 * uDark + 0.35 * tw);
  al *= 1.0 + 1.5 * tw; sz *= 1.0 + 0.3 * tw;
  float px = 2.4 * sz * uDpr;
  if (px < 3.0) { al *= px * px / 9.0; px = 3.0; }
  gl_PointSize = px;
  gl_Position = vec4(pos.x / uRes.x * 2.0 - 1.0, 1.0 - pos.y / uRes.y * 2.0, 0.0, 1.0);
  vCol = vec4(col * al, min(al * uLum, 1.0));
}`;

  const SPARK = `#version 300 es
precision mediump float;
in vec4 vCol;
out vec4 o;
void main() { vec2 p = gl_PointCoord * 2.0 - 1.0; o = vCol * max(0.0, exp(-4.0 * dot(p, p)) - 0.0183) * 1.0187; }`;

  const Dust = (() => {
    let gl = null, F = null, P = null, tex = null, ready = false, live = false, broke = false, n = 0, o = null;

    function program(vs, fs) {
      const p = gl.createProgram();
      for (const [type, src] of [[gl.VERTEX_SHADER, vs], [gl.FRAGMENT_SHADER, fs]]) { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); gl.attachShader(p, s); }
      gl.linkProgram(p);
      return { p, u: {} };
    }

    function check(X) {
      if (!gl.getProgramParameter(X.p, gl.LINK_STATUS)) throw new Error(gl.getAttachedShaders(X.p).map((s) => gl.getShaderInfoLog(s)).join(" ") + gl.getProgramInfoLog(X.p));
      for (let i = 0, k = gl.getProgramParameter(X.p, gl.ACTIVE_UNIFORMS); i < k; i++) { const name = gl.getActiveUniform(X.p, i).name.replace(/\[0\]$/, ""); X.u[name] = gl.getUniformLocation(X.p, name); }
    }

    function setup() {
      if (broke) return false;
      try {
        gl = gl || dust.getContext("webgl2", { alpha: true, premultipliedAlpha: true, antialias: false, depth: false, stencil: false });
        if (!gl) { broke = true; return false; }
        if (gl.isContextLost()) return false;
        F = program(QUAD, FIELD); P = program(MOTE, SPARK); tex = gl.createTexture(); ready = live = false;
        return true;
      } catch (e) { console.error(e); broke = true; return false; }
    }

    function prime() {
      if (live || !warm()) return live;
      try { check(F); check(P); } catch (e) { console.error(e); broke = true; F = null; return false; }
      const keep = o;
      o = { spin: 0, w0: 1, kf: 1, wm: 0, sc0: 1, sc1: 1, ga: 0, dir: 1 }; n = 1;
      render(-1); wipe();
      o = keep;
      return (live = true);
    }

    function load() {
      if (!F || !veil.complete || !veil.naturalWidth) return (ready = false);
      try {
        const c = document.createElement("canvas"), g = c.getContext("2d");
        c.width = c.height = 1024;
        g.fillStyle = "#000"; g.fillRect(0, 0, 1024, 1024); g.drawImage(veil, 0, 0, 1024, 1024);
        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.R8, gl.RED, gl.UNSIGNED_BYTE, c);
        for (const [k, v] of [[gl.TEXTURE_MIN_FILTER, gl.LINEAR], [gl.TEXTURE_MAG_FILTER, gl.LINEAR], [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]]) gl.texParameteri(gl.TEXTURE_2D, k, v);
        return (ready = true);
      } catch (e) { console.error(e); return (ready = false); }
    }

    function warm() { if (!F && !setup()) return false; return ready || load(); }

    function start(opt) {
      if (!prime() || gl.isContextLost()) return false;
      o = opt;
      n = Math.round((Math.PI * (1.06 * REACH * u) ** 2) / (M / 300) ** 2);
      return true;
    }

    function wipe() {
      if (!F) return;
      gl.viewport(0, 0, dust.width, dust.height);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
    }

    function use(X, vals) {
      gl.useProgram(X.p);
      for (const k in vals) { const l = X.u[k], v = vals[k]; if (!l) continue; if (typeof v === "number") gl.uniform1f(l, v); else if (v.length === 2) gl.uniform2fv(l, v); else gl.uniform3fv(l, v); }
    }

    function still(spin, sc, ga, boost) {
      if (!live || gl.isContextLost()) return false;
      const keep = o;
      o = { spin, w0: 0, kf: 1, wm: 0, sc0: sc, sc1: sc, ga, dir: 1, boost };
      render(-1, 1, false);
      o = keep;
      return true;
    }

    function render(t, env = 1, motes = true) {
      if (!F || !o) return;
      wipe();
      const dk = scheme.matches, { x: wx, y: wy } = G.wind;
      const vals = { uRes: [W, H], uC: [W / 2, H / 2], uWind: [wx * M * GUST, wy * M * GUST], uDpr: DPR, uT: t, uSpin0: o.spin, uW0: o.w0, uKf: o.kf, uWm: o.wm, uSc0: o.sc0, uSc1: o.sc1, uGa: o.ga, uRm: R, uRg: REACH * u, uL: 0.16 * M, uT0: 0.02, uT1: 0.8, uDir: o.dir, uLum: dk ? 0.6 : 0.9, uFlow: 0.2 * M, uGrain: M / 300, uDot: clamp(M / 800, 0.6, 1.2), uBoost: o.boost || 0, uDark: dk ? 1 : 0, uEnv: env, uStops: RGB, uGround: dk ? [0, 0, 0] : [1, 1, 1] };
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, tex);
      if (t < VEIL) { gl.disable(gl.BLEND); use(F, vals); gl.drawArrays(gl.TRIANGLES, 0, 3); }
      if (!motes) return;
      gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
      use(P, vals); gl.drawArrays(gl.POINTS, 0, n);
    }

    dust.addEventListener("webglcontextlost", (e) => { e.preventDefault(); F = null; ready = live = false; });
    return { warm, prime, load, start, still, render, wipe };
  })();

  /* PHASES */

  let phase = "lock", clock = 0, last = performance.now(), turn = 0, rate = IDLE, depth = 0, pull = 0, press = 0, held = false, idle = 0, age = 0, seen = false, lit = 0, lid = false, sc = 1, ga = 1, flung = false, from = null, looping = false;

  function look(d) {
    const b = 0.5 - 0.5 * Math.cos(BREATH * age), k = smooth((age - 0.05) / 1.4);
    return { sc: lerp(0.96, 1, k) * (1 + 0.016 * b) * (1 - 0.055 * d), ga: k * lerp(0.93 + 0.07 * b, 1, d) };
  }

  function breathe() {
    ({ sc, ga } = look(clamp(depth, 0, 1)));
    glow.style.transform = `scale(${sc.toFixed(4)})`;
    glow.style.opacity = ga.toFixed(3);
    ink.style.opacity = age < 0.7 ? smooth(age / 0.6).toFixed(3) : "";
  }

  function cue(dt) {
    const on = !held && idle > 1.8 && age > 1.6 ? 1 : 0;
    lit += (on - lit) * (1 - Math.exp(-dt / (on ? 0.7 : 0.12)));
    hint.style.opacity = (lit * (0.82 + 0.18 * (0.5 - 0.5 * Math.cos(BREATH * age)))).toFixed(3);
    hint.style.transform = `translateY(${(6 * (1 - lit)).toFixed(2)}px)`;
  }

  function tint(spin) { glow.style.setProperty("--a", `${(90 - deg(START) + deg(spin)).toFixed(2)}deg`); }

  function lock(dt, raw) {
    idle += dt; if (seen) age += dt;
    if (held) {
      press = Math.min(1, press + Math.min(raw, 1) / HOLD);
      depth = 1 - (1 - press) ** 2; pull = 0;
    } else {
      pull += (-SPRING * SPRING * depth - 2 * SPRINGZ * SPRING * pull) * dt;
      depth += pull * dt;
      if (Math.abs(depth) < 1e-4 && Math.abs(pull) < 1e-3) depth = pull = 0;
      press = depth > 0 ? 1 - Math.sqrt(Math.max(0, 1 - depth)) : 0;
    }
    rate = IDLE + WIND * Math.max(0, depth) ** 2;
    turn += rate * dt;
    breathe(); cue(dt);
    const b = clamp(depth, 0, 1) ** 1.5 * BOOST, was = lid;
    lid = b > 0.002 && Dust.still(turn - START, sc, ga, b);
    if (!lid) { tint(turn); if (was) Dust.wipe(); }
    if (press >= 1) launch();
  }

  function ripe() { age = Math.max(age, 1.6); ink.style.opacity = ""; }

  function launch() {
    phase = "fly"; clock = 0; depth = 1; pull = 0; lid = false;
    flung = Dust.start({ spin: turn - START, w0: rate, kf: 1.6, wm: 0, sc0: sc, sc1: 1.1, ga, dir: 1, boost: clamp(depth, 0, 1) ** 1.5 * BOOST });
    ripe();
    if (flung) { glow.style.opacity = "0"; host.style.setProperty("--veil", "0"); }
    hint.style.opacity = "0";
    host.classList.add("fly");
    Sky.resume();
  }

  function fade(t) {
    const k = clamp(t / END, 0, 1);
    host.style.setProperty("--veil", (1 - smooth((k - 0.1) / 0.6)).toFixed(3));
    glow.style.opacity = (ga * (1 - smooth(k / 0.55))).toFixed(3);
    glow.style.transform = `scale(${(sc * (1 + 0.22 * smooth(k / 0.7))).toFixed(4)})`;
  }

  function fly(dt) {
    pull += (-POP * POP * depth - 2 * POPZ * POP * pull) * dt;
    depth += pull * dt;
    if (flung) return;
    rate *= Math.exp(-1.6 * dt); turn += rate * dt;
    tint(turn); fade(clock);
  }

  function rising() {
    const k = clamp((clock - FLY) / MORPH, 0, 1), e = smooth(k), wings = clock - FLY - (MORPH - 2 * BEAT);
    const amp = wings > 0 ? smooth(wings / 0.3) : 0, a = logo(1), b = lift(), s = blend(a, b, e);
    return { ...s, depth, squeeze: smooth(k / 0.4), color: mix(a.color, b.color, smooth((clock - 0.4) / 0.6)), pose: amp ? beat(wings).map((p) => p * amp) : REST };
  }

  function returning() {
    const k = clamp((clock - 0.3) / MORPH, 0, 1), e = smooth(k), amp = 1 - smooth(k / 0.8), b = logo(), s = blend(from, b, e);
    return { ...s, squeeze: 1 - smooth((clock - (END - 0.22)) / 0.22), color: mix(from.color, b.color, smooth((clock - 0.9) / 0.7)), pose: amp ? beat(clock).map((p) => p * amp) : REST };
  }

  function done() {
    phase = "open";
    Sky.skip.bird = false; G.visible = true;
    clear();
    host.classList.remove("fly"); host.classList.add("open");
    host.style.setProperty("--veil", "0");
    if (!flung) { Dust.wipe(); lid = false; }
    root.classList.remove("splashing");
    dispatchEvent(new Event("splashdone"));
  }

  function trail() {
    if (clock < TRAIL) { dust.style.opacity = clamp(1 - scrollY / (0.5 * H), 0, 1).toFixed(3); return Dust.render(clock); }
    Dust.wipe(); flung = false; dust.style.opacity = "";
  }

  function relock() {
    if (phase !== "open") return;
    scrollTo({ top: 0, behavior: "instant" });
    from = sky();
    phase = "back"; clock = 0; dust.style.opacity = "";
    root.classList.add("splashing");
    host.classList.remove("open"); host.classList.add("fly");
    Sky.skip.bird = true; G.visible = false;
    const end = turn + IDLE * END;
    ({ sc, ga } = look(0));
    flung = Dust.start({ spin: end - START, w0: -IDLE, kf: 1e-3, wm: 2.6, sc0: sc, sc1: 1.1, ga, dir: -1 });
    if (flung) turn = end;
    else Dust.wipe();
    dispatchEvent(new Event("splashlock"));
  }

  function settle() {
    phase = "lock"; clock = 0; idle = 0; depth = 0; pull = -7; press = 0; held = false; lit = 0;
    host.classList.remove("fly");
    host.style.setProperty("--veil", "1");
    flung = false; lid = true;
    tint(turn); breathe();
    Sky.pause();
    Mood.shuffle();
  }

  function finish() {
    if (phase !== "lock") return;
    ripe(); Sky.resume(); done();
  }

  function advance(dt, raw) {
    clock += dt;
    if (phase === "lock") lock(dt, raw);
    else if (phase === "fly") fly(dt);
    else if (phase === "back" && !flung) { turn += IDLE * dt; tint(turn); fade(Math.max(0, END - clock)); }
  }

  function show() {
    if (phase === "lock") return draw({ ...logo(smooth(depth)), depth });
    if (phase === "fly") {
      if (flung) Dust.render(clock);
      const o = rising();
      draw(o);
      if (clock >= END) { phase = "hand"; handoff(o, "flap"); setTimeout(done, 110); }
    } else if (phase === "back") {
      if (flung) Dust.render(END * (1 - smooth(clock / END)), smooth(clock / 0.6));
      draw(returning());
      if (clock >= END) settle();
    } else if (flung) trail();
  }

  function frame(now) {
    const raw = Math.max(0, (now - last) / 1000), dt = Math.min(0.05, raw);
    last = now;
    try { advance(dt, raw); show(); } catch (e) { console.error(e); looping = false; return bail(); }
    if (phase === "lock" || phase === "fly" || phase === "back" || flung) requestAnimationFrame(frame);
    else looping = false;
  }

  function bail() {
    phase = "open";
    Sky.skip.bird = false; G.visible = true;
    root.classList.remove("splashing");
    host.remove();
    Sky.resume();
    dispatchEvent(new Event("splashdone"));
  }

  function run() { if (looping) return; looping = true; last = performance.now(); requestAnimationFrame(frame); }

  /* RELOCK */

  addEventListener("click", (e) => {
    if (phase !== "open" || e.target !== G.canvas) return;
    relock(); run();
  });

  /* INPUT */

  function hold(on) {
    if (phase !== "lock") return;
    held = on; idle = 0;
    if (on) Dust.prime();
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
  veil.onload = () => Dust.load();
  veil.decode().catch(() => {}).then(() => { seen = true; Dust.warm(); });
  setTimeout(() => (seen = true), 900);
  host.focus({ preventScroll: true });
  addEventListener("resize", queue);
  addEventListener("keydown", key);
  addEventListener("keyup", key);
  if (q.get("at")) {
    veil.decode().then(() => {
      const end = +q.get("at");
      age = 9; held = true;
      while (phase === "lock") advance(1 / 60, 1 / 60);
      for (let s = 0; s < end && phase === "fly"; s += 1 / 60) advance(1 / 60, 1 / 60);
      Sky.pause(); Sky.jump(FLY + end);
      if (flung) Dust.render(clock);
      draw(rising());
    });
  } else { tint(turn); breathe(); run(); setTimeout(() => Dust.prime(), 2000); }
  return { finish, relock: () => { relock(); if (phase === "back") run(); } };
})();
