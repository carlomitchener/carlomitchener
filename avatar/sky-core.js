const Core = (() => {
  const TAU = Math.PI * 2;
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const smooth = (t) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));
  const hash = (i) => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
  const noise = (t, k = 0) => { const i = Math.floor(t) + k * 1000, f = t - Math.floor(t), u = f * f * (3 - 2 * f); return (hash(i) * (1 - u) + hash(i + 1) * u) * 2 - 1; };
  const rng = (seed) => () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let r = Math.imul(seed ^ (seed >>> 15), 1 | seed); r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r; return ((r ^ (r >>> 14)) >>> 0) / 4294967296; };
  const parse = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  const format = (rgb) => "#" + rgb.map((v) => Math.round(clamp(v, 0, 255)).toString(16).padStart(2, "0")).join("");
  const mix = (a, b, t) => format(parse(a).map((v, i) => v + (parse(b)[i] - v) * t));
  const rgba = (hex, a) => `rgba(${parse(hex).join(",")},${a})`;
  return { TAU, clamp, lerp, smooth, hash, noise, rng, parse, format, mix, rgba, P: PALETTE };
})();

const G = { canvas: null, ctx: null, W: 0, H: 0, S: 0, DPR: 1, t: 0, wind: { x: 1, y: 0 }, T: null, seed: 0, rnd: Math.random, rebuild: () => {}, visible: true };

const typing = (e) => { const t = e.target; return !!t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT" || t.isContentEditable); };
