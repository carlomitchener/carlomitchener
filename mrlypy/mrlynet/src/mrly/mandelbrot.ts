export interface Viewport {
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
}

export const DEFAULT_VIEWPORT: Viewport = { xMin: -2, xMax: 1, yMin: -1.5, yMax: 1.5 };

// ASPECT RATIO

export function fitViewport(v: Viewport, canvasW: number, canvasH: number): Viewport {
  const vw = v.xMax - v.xMin;
  const vh = v.yMax - v.yMin;
  const ca = canvasW / canvasH;
  const va = vw / vh;
  const cx = (v.xMin + v.xMax) / 2;
  const cy = (v.yMin + v.yMax) / 2;
  if (ca > va) {
    const nw = vh * ca;
    return { xMin: cx - nw / 2, xMax: cx + nw / 2, yMin: v.yMin, yMax: v.yMax };
  }
  const nh = vw / ca;
  return { xMin: v.xMin, xMax: v.xMax, yMin: cy - nh / 2, yMax: cy + nh / 2 };
}

export function autoMaxIter(zoomLevel: number): number {
  return 100 + Math.floor(50 * Math.log2(Math.max(zoomLevel, 1)));
}

// SHADER

export const MANDELBROT_FRAG = `#version 300 es
precision highp float;
uniform vec2 u_resolution;
uniform vec4 u_viewport;
uniform int u_maxIter;
uniform vec3 u_primary;
uniform vec3 u_accent;
uniform float u_rotation;
uniform float u_time;
out vec4 fragColor;
void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution;
  float cr = mix(u_viewport.x, u_viewport.y, uv.x);
  float ci = mix(u_viewport.w, u_viewport.z, uv.y);
  float mr = (u_viewport.x + u_viewport.y) * 0.5;
  float mi = (u_viewport.z + u_viewport.w) * 0.5;
  float dr = cr - mr, di = ci - mi;
  float ca = cos(u_rotation), sa = sin(u_rotation);
  cr = dr * ca - di * sa + mr;
  ci = dr * sa + di * ca + mi;
  float zr = 0.0, zi = 0.0;
  int iter = 0;
  for (int i = 0; i < 1000; i++) {
    if (i >= u_maxIter) break;
    if (zr * zr + zi * zi > 128.0) break;
    float tmp = zr * zr - zi * zi + cr;
    zi = 2.0 * zr * zi + ci;
    zr = tmp;
    iter++;
  }
  if (iter >= u_maxIter) {
    fragColor = vec4(u_primary, 1.0);
  } else {
    float sl = float(iter) - log2(log2(zr * zr + zi * zi)) + 4.0;
    float t = 0.5 + 0.5 * cos(3.0 + sl * 0.15 + u_time);
    fragColor = vec4(mix(u_primary, u_accent, t), 1.0);
  }
}
`;
