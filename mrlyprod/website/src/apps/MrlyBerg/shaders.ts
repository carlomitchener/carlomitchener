// VERTEX

export const VERT_SOURCE = `#version 300 es
in vec2 a_position;
out vec2 v_uv;
void main() {
  v_uv = a_position * 0.5 + 0.5;
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`;

// MAX_SOURCES

export const MAX_SOURCES = 16;

// UPDATE

export const UPDATE_FRAG = `#version 300 es
precision highp float;
uniform sampler2D u_curr;
uniform sampler2D u_prev;
uniform sampler2D u_mask;
uniform vec2 u_resolution;
uniform float u_c2;
uniform float u_damp;
uniform float u_reflect;
uniform int u_sourceCount;
uniform vec3 u_sources[16];
uniform float u_sourceSigma;
in vec2 v_uv;
out vec4 outColor;
void main() {
  vec2 px = 1.0 / u_resolution;
  float m = step(0.5, texture(u_mask, v_uv).r);
  float wall = m * u_reflect;
  float c = texture(u_curr, v_uv).r;
  float p = texture(u_prev, v_uv).r;
  float lv = texture(u_curr, v_uv + vec2(-px.x, 0.0)).r;
  float rv = texture(u_curr, v_uv + vec2(px.x, 0.0)).r;
  float uv_ = texture(u_curr, v_uv + vec2(0.0, -px.y)).r;
  float dv = texture(u_curr, v_uv + vec2(0.0, px.y)).r;
  float ml = step(0.5, texture(u_mask, v_uv + vec2(-px.x, 0.0)).r) * u_reflect;
  float mr = step(0.5, texture(u_mask, v_uv + vec2(px.x, 0.0)).r) * u_reflect;
  float mu = step(0.5, texture(u_mask, v_uv + vec2(0.0, -px.y)).r) * u_reflect;
  float md = step(0.5, texture(u_mask, v_uv + vec2(0.0, px.y)).r) * u_reflect;
  lv *= 1.0 - ml; rv *= 1.0 - mr; uv_ *= 1.0 - mu; dv *= 1.0 - md;
  float lap = lv + rv + uv_ + dv - 4.0 * c;
  float n = 2.0 * c - p + u_c2 * lap - u_damp * (c - p);
  n *= 1.0 - wall;
  vec2 fragXY = v_uv * u_resolution;
  float src = 0.0;
  for (int i = 0; i < 16; i++) {
    if (i >= u_sourceCount) break;
    vec3 s = u_sources[i];
    vec2 d = fragXY - s.xy;
    float r2 = dot(d, d);
    src += s.z * exp(-r2 / (u_sourceSigma * u_sourceSigma));
  }
  n += src * (1.0 - wall);
  outColor = vec4(n, 0.0, 0.0, 1.0);
}
`;

// RENDER

export const RENDER_FRAG = `#version 300 es
precision highp float;
uniform sampler2D u_curr;
uniform sampler2D u_mask;
uniform vec3 u_accent;
uniform vec3 u_bg;
uniform vec3 u_wall;
uniform float u_gain;
uniform float u_reflect;
in vec2 v_uv;
out vec4 outColor;
void main() {
  float m = step(0.5, texture(u_mask, v_uv).r);
  float u = texture(u_curr, v_uv).r * u_gain;
  float a = clamp(u, -1.0, 1.0);
  vec3 pos = u_accent;
  vec3 neg = vec3(1.0) - u_accent;
  vec3 waveCol = mix(u_bg, a > 0.0 ? pos : neg, abs(a));
  float wallVis = mix(0.35, 1.0, u_reflect);
  vec3 col = mix(waveCol, u_wall, m * wallVis);
  outColor = vec4(col, 1.0);
}
`;
