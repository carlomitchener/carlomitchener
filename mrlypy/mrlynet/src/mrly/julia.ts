import type { Viewport } from "./mandelbrot";

export const DEFAULT_VIEWPORT: Viewport = { xMin: -1.5, xMax: 1.5, yMin: -1.5, yMax: 1.5 };

// PRESETS

export const PRESETS = [
  { label: "-0.4+0.6i", re: -0.4, im: 0.6 },
  { label: "-0.8+0.156i", re: -0.8, im: 0.156 },
  { label: "0.285+0.01i", re: 0.285, im: 0.01 },
  { label: "-0.727+0.189i", re: -0.7269, im: 0.1889 },
  { label: "-0.1+0.651i", re: -0.1, im: 0.651 },
  { label: "0.355+0.355i", re: 0.355, im: 0.355 },
] as const;

// SHADER

export const JULIA_FRAG = `#version 300 es
precision highp float;
uniform vec2 u_resolution;
uniform vec4 u_viewport;
uniform vec2 u_c;
uniform int u_maxIter;
uniform vec3 u_primary;
uniform vec3 u_accent;
uniform float u_rotation;
uniform float u_time;
out vec4 fragColor;
void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution;
  float zr = mix(u_viewport.x, u_viewport.y, uv.x);
  float zi = mix(u_viewport.w, u_viewport.z, uv.y);
  float mr = (u_viewport.x + u_viewport.y) * 0.5;
  float mi = (u_viewport.z + u_viewport.w) * 0.5;
  float dr = zr - mr, di = zi - mi;
  float ca = cos(u_rotation), sa = sin(u_rotation);
  zr = dr * ca - di * sa + mr;
  zi = dr * sa + di * ca + mi;
  int iter = 0;
  for (int i = 0; i < 1000; i++) {
    if (i >= u_maxIter) break;
    if (zr * zr + zi * zi > 128.0) break;
    float tmp = zr * zr - zi * zi + u_c.x;
    zi = 2.0 * zr * zi + u_c.y;
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
