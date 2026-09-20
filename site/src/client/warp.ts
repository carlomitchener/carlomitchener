const IDLE = 0.015;
const MAX = 14;
const WIND = 0.28;
const RUN = 1;
const FLASH = 0.22;
const END = WIND + RUN + FLASH;
const BLOOM = WIND + RUN * 0.82;
const GIVE_UP = END + 6;
const TAU = Math.PI * 2;

type Star = { x: number; y: number; z: number; m: number; r: number; f: number; p: number; h: string };

const calm = matchMedia("(prefers-reduced-motion: reduce)").matches;
const rnd = (a: number, b: number) => a + Math.random() * (b - a);
const clamp = (v: number, a: number, b: number) => Math.min(Math.max(v, a), b);
const token = (name: string) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

let canvas: HTMLCanvasElement | null = null;

function fly(href: string) {
  const black = token("--black") || "#000000";
  const white = token("--white") || "#ffffff";
  const cyan = token("--cyan") || "#1ec9f3";
  const blue = token("--blue") || "#008cff";
  canvas = document.createElement("canvas");
  canvas.className = "warp";
  document.body.append(canvas);
  const ctx = canvas.getContext("2d")!;
  let W = 0;
  let H = 0;
  let dpr = 1;
  let edge = 0;
  let roll = 0;
  let sent = false;
  let stars: Star[] = [];
  const t0 = performance.now();
  let last = t0;

  const spawn = (s: Partial<Star>, far: boolean): Star => {
    const sx = rnd(-0.55, 0.55) * W;
    const sy = rnd(-0.55, 0.55) * H;
    const c = Math.cos(roll);
    const n = Math.sin(roll);
    s.z = far ? rnd(1, 1.15) : rnd(0.08, 1);
    s.x = (sx * c + sy * n) * s.z;
    s.y = (sy * c - sx * n) * s.z;
    s.m = rnd(0.25, 1);
    s.r = 0.5 + Math.random() ** 3 * 2.2;
    s.f = rnd(0.5, 2.5);
    s.p = rnd(0, TAU);
    s.h = Math.random() < 0.35 ? blue : cyan;
    return s as Star;
  };

  const size = () => {
    if (!canvas) return;
    W = innerWidth;
    H = innerHeight;
    dpr = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    edge = Math.hypot(W, H) * 0.54;
    stars = Array.from({ length: clamp(Math.round((W * H) / 1100), 400, 1400) }, () => spawn({}, false));
  };

  const speedAt = (t: number) => {
    if (t < WIND) return IDLE - 0.4 * Math.sin((Math.PI * t) / WIND);
    if (t > END) return IDLE + MAX * Math.max(0, 1 - (t - END) * 4);
    return IDLE + MAX * Math.min((t - WIND) / RUN, 1) ** 2.5;
  };

  const streak = (tx: number, ty: number, hx: number, hy: number, w: number, color: string, alpha: number) => {
    const dx = hx - tx;
    const dy = hy - ty;
    const len = Math.hypot(dx, dy);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = color;
    ctx.beginPath();
    if (len < w) ctx.arc(hx, hy, w / 2, 0, TAU);
    else {
      const ang = Math.atan2(dy, dx);
      ctx.moveTo(tx, ty);
      ctx.arc(hx, hy, w / 2, ang + Math.PI / 2, ang - Math.PI / 2, true);
    }
    ctx.fill();
  };

  const frame = () => {
    if (!canvas) return;
    const now = performance.now();
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    const t = (now - t0) / 1000;
    if (t > GIVE_UP) return reset();
    const p = t > END ? 0 : clamp((t - WIND) / RUN, 0, 1);
    const speed = speedAt(t);
    const tail = p > 0 ? speed * (0.04 + 0.1 * p) : 0;
    const q = clamp((p - 0.75) / 0.25, 0, 1) ** 2;
    const glow = 1 + 0.8 * p;
    const shake = p > 0.5 ? 3 * ((p - 0.5) * 2) ** 2 : 0;
    roll += dt * 0.012;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = 1;
    ctx.fillStyle = black;
    ctx.fillRect(0, 0, W, H);
    ctx.translate(W / 2 + rnd(-shake, shake), H / 2 + rnd(-shake, shake));
    ctx.rotate(roll);
    ctx.globalCompositeOperation = "lighter";
    for (const s of stars) {
      s.z -= speed * dt;
      if (s.z < 0.04) spawn(s, true);
      const hx = s.x / s.z;
      const hy = s.y / s.z;
      if (hx * hx + hy * hy > edge * edge) {
        spawn(s, true);
        continue;
      }
      const zt = Math.min(s.z + tail, 2);
      const tx = s.x / zt;
      const ty = s.y / zt;
      const near = 1 - Math.min(s.z, 1);
      const tw = 0.75 + 0.25 * Math.sin((now / 1000) * s.f + s.p);
      const a = Math.min(1, s.m * (0.3 + 0.7 * near) * tw * glow);
      const w = Math.min(s.r * (0.5 + 1.5 * near), 5);
      streak(tx, ty, hx, hy, w * (3.2 + 6 * q), s.h, a * (0.22 + 0.4 * q));
      streak(tx, ty, hx, hy, w, white, a);
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const f = clamp((t - BLOOM) / (END - BLOOM), 0, 1);
    if (t > END) {
      ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = 1;
      ctx.fillStyle = white;
      ctx.fillRect(0, 0, W, H);
    } else if (f > 0) {
      const g = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, edge * (0.35 + 1.3 * f));
      g.addColorStop(0, white);
      g.addColorStop(0.25, "rgba(30, 201, 243, 0.8)");
      g.addColorStop(0.65, "rgba(0, 140, 255, 0.35)");
      g.addColorStop(1, "rgba(0, 140, 255, 0)");
      ctx.globalAlpha = Math.min(1, 3 * f * f);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
      ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = clamp((f - 0.55) / 0.45, 0, 1) ** 2;
      ctx.fillStyle = white;
      ctx.fillRect(0, 0, W, H);
    }
    if (!sent && t >= BLOOM) {
      sent = true;
      location.assign(href);
    }
    requestAnimationFrame(frame);
  };

  addEventListener("resize", size);
  size();
  requestAnimationFrame(() => canvas?.classList.add("on"));
  requestAnimationFrame(frame);
}

function reset() {
  canvas?.remove();
  canvas = null;
}

document.addEventListener("click", (event) => {
  const buy = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>("a[data-buy]") : null;
  if (!buy || !buy.href || buy.getAttribute("aria-disabled") === "true") return;
  if (calm || canvas || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
  event.preventDefault();
  fly(buy.href);
});

addEventListener("pageshow", (event) => event.persisted && reset());
