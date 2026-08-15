import { useCallback, useEffect, useRef } from "react";
import { createShader } from "../../mrly";
import { VERT_SOURCE, UPDATE_FRAG, RENDER_FRAG, MAX_SOURCES } from "./shaders";
import { uploadMaskTexture, type Mask } from "./mask";

// TYPES

interface Source {
  x: number;
  y: number;
  born: number;
  phase: number;
}

interface UpdateLocs {
  curr: WebGLUniformLocation | null;
  prev: WebGLUniformLocation | null;
  mask: WebGLUniformLocation | null;
  resolution: WebGLUniformLocation | null;
  c2: WebGLUniformLocation | null;
  damp: WebGLUniformLocation | null;
  reflect: WebGLUniformLocation | null;
  sourceCount: WebGLUniformLocation | null;
  sources: WebGLUniformLocation | null;
  sourceSigma: WebGLUniformLocation | null;
}

interface RenderLocs {
  curr: WebGLUniformLocation | null;
  mask: WebGLUniformLocation | null;
  accent: WebGLUniformLocation | null;
  bg: WebGLUniformLocation | null;
  wall: WebGLUniformLocation | null;
  gain: WebGLUniformLocation | null;
  reflect: WebGLUniformLocation | null;
}

interface GLState {
  gl: WebGL2RenderingContext;
  updProg: WebGLProgram;
  rndProg: WebGLProgram;
  updLocs: UpdateLocs;
  rndLocs: RenderLocs;
  vao: WebGLVertexArrayObject;
  buffer: WebGLBuffer;
  maskTex: WebGLTexture;
  texs: WebGLTexture[];
  fbos: WebGLFramebuffer[];
  width: number;
  height: number;
  idx: number;
}

export interface WavesProps {
  mask: Mask;
  accent: { r: number; g: number; b: number };
  dark: boolean;
  paused: boolean;
  damping: number;
  speed: number;
  reflect: number;
  sourceFreq: number;
  sourceSigma: number;
  sourceAmp: number;
  gain: number;
  epoch: number;
}

// HELPERS

function makeProgram(gl: WebGL2RenderingContext, vs: WebGLShader, fs: WebGLShader): WebGLProgram {
  const p = gl.createProgram()!;
  gl.attachShader(p, vs);
  gl.attachShader(p, fs);
  gl.bindAttribLocation(p, 0, "a_position");
  gl.linkProgram(p);
  return p;
}

function makeFloatTexture(gl: WebGL2RenderingContext, w: number, h: number): WebGLTexture {
  const t = gl.createTexture()!;
  gl.bindTexture(gl.TEXTURE_2D, t);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.R16F, w, h, 0, gl.RED, gl.HALF_FLOAT, null);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  return t;
}

function makeFBO(gl: WebGL2RenderingContext, tex: WebGLTexture): WebGLFramebuffer {
  const fbo = gl.createFramebuffer()!;
  gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
  return fbo;
}

// COMPONENT

export function Waves(props: WavesProps) {
  const { mask, epoch } = props;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const propsRef = useRef(props);
  propsRef.current = props;
  const sourcesRef = useRef<Source[]>([]);
  const stateRef = useRef<GLState | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = mask.width;
    canvas.height = mask.height;
    const gl = canvas.getContext("webgl2", { antialias: false, alpha: false });
    if (!gl) return;
    if (!gl.getExtension("EXT_color_buffer_float")) {
      console.warn("EXT_color_buffer_float not supported, waves disabled");
      return;
    }
    const vs = createShader(gl, gl.VERTEX_SHADER, VERT_SOURCE);
    const updFs = createShader(gl, gl.FRAGMENT_SHADER, UPDATE_FRAG);
    const rndFs = createShader(gl, gl.FRAGMENT_SHADER, RENDER_FRAG);
    const updProg = makeProgram(gl, vs, updFs);
    const rndProg = makeProgram(gl, vs, rndFs);
    const vao = gl.createVertexArray()!;
    gl.bindVertexArray(vao);
    const buffer = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
      gl.STATIC_DRAW
    );
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    const maskTex = uploadMaskTexture(gl, mask);
    const texs = [
      makeFloatTexture(gl, mask.width, mask.height),
      makeFloatTexture(gl, mask.width, mask.height),
      makeFloatTexture(gl, mask.width, mask.height),
    ];
    const fbos = texs.map((t) => makeFBO(gl, t));
    for (const fbo of fbos) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
    }
    const updLocs: UpdateLocs = {
      curr: gl.getUniformLocation(updProg, "u_curr"),
      prev: gl.getUniformLocation(updProg, "u_prev"),
      mask: gl.getUniformLocation(updProg, "u_mask"),
      resolution: gl.getUniformLocation(updProg, "u_resolution"),
      c2: gl.getUniformLocation(updProg, "u_c2"),
      damp: gl.getUniformLocation(updProg, "u_damp"),
      reflect: gl.getUniformLocation(updProg, "u_reflect"),
      sourceCount: gl.getUniformLocation(updProg, "u_sourceCount"),
      sources: gl.getUniformLocation(updProg, "u_sources"),
      sourceSigma: gl.getUniformLocation(updProg, "u_sourceSigma"),
    };
    const rndLocs: RenderLocs = {
      curr: gl.getUniformLocation(rndProg, "u_curr"),
      mask: gl.getUniformLocation(rndProg, "u_mask"),
      accent: gl.getUniformLocation(rndProg, "u_accent"),
      bg: gl.getUniformLocation(rndProg, "u_bg"),
      wall: gl.getUniformLocation(rndProg, "u_wall"),
      gain: gl.getUniformLocation(rndProg, "u_gain"),
      reflect: gl.getUniformLocation(rndProg, "u_reflect"),
    };
    stateRef.current = {
      gl, updProg, rndProg, updLocs, rndLocs, vao, buffer,
      maskTex, texs, fbos,
      width: mask.width, height: mask.height, idx: 0,
    };
    return () => {
      gl.deleteProgram(updProg);
      gl.deleteProgram(rndProg);
      gl.deleteShader(vs);
      gl.deleteShader(updFs);
      gl.deleteShader(rndFs);
      gl.deleteVertexArray(vao);
      gl.deleteBuffer(buffer);
      gl.deleteTexture(maskTex);
      for (const t of texs) gl.deleteTexture(t);
      for (const f of fbos) gl.deleteFramebuffer(f);
      stateRef.current = null;
    };
  }, [mask]);

  useEffect(() => {
    sourcesRef.current = [];
    const s = stateRef.current;
    if (!s) return;
    for (const fbo of s.fbos) {
      s.gl.bindFramebuffer(s.gl.FRAMEBUFFER, fbo);
      s.gl.clearColor(0, 0, 0, 0);
      s.gl.clear(s.gl.COLOR_BUFFER_BIT);
    }
  }, [epoch]);

  useEffect(() => {
    let animId = 0;
    const sourceData = new Float32Array(MAX_SOURCES * 3);
    const tick = () => {
      animId = requestAnimationFrame(tick);
      const s = stateRef.current;
      const p = propsRef.current;
      if (!s) return;
      const { gl, width: W, height: H } = s;
      if (!p.paused) {
        const nextIdx = s.idx;
        const currIdx = (s.idx + 2) % 3;
        const prevIdx = (s.idx + 1) % 3;
        const currTex = s.texs[currIdx];
        const prevTex = s.texs[prevIdx];
        const nextFBO = s.fbos[nextIdx];
        gl.useProgram(s.updProg);
        gl.bindVertexArray(s.vao);
        gl.bindFramebuffer(gl.FRAMEBUFFER, nextFBO);
        gl.viewport(0, 0, W, H);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, currTex);
        gl.uniform1i(s.updLocs.curr, 0);
        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, prevTex);
        gl.uniform1i(s.updLocs.prev, 1);
        gl.activeTexture(gl.TEXTURE2);
        gl.bindTexture(gl.TEXTURE_2D, s.maskTex);
        gl.uniform1i(s.updLocs.mask, 2);
        gl.uniform2f(s.updLocs.resolution, W, H);
        gl.uniform1f(s.updLocs.c2, p.speed);
        gl.uniform1f(s.updLocs.damp, p.damping);
        gl.uniform1f(s.updLocs.reflect, p.reflect);
        gl.uniform1f(s.updLocs.sourceSigma, p.sourceSigma);
        const now = performance.now();
        const sources = sourcesRef.current;
        sourceData.fill(0);
        const n = Math.min(sources.length, MAX_SOURCES);
        for (let i = 0; i < n; i++) {
          const src = sources[i];
          const age = (now - src.born) / 1000;
          const env = Math.min(1, age * 4) * Math.exp(-age * 0.4);
          const v = p.sourceAmp * env * Math.sin(2 * Math.PI * p.sourceFreq * age + src.phase);
          sourceData[i * 3] = src.x;
          sourceData[i * 3 + 1] = H - src.y;
          sourceData[i * 3 + 2] = v;
        }
        gl.uniform1i(s.updLocs.sourceCount, n);
        gl.uniform3fv(s.updLocs.sources, sourceData);
        gl.drawArrays(gl.TRIANGLES, 0, 6);
        sourcesRef.current = sources.filter((src) => now - src.born < 15000);
        s.idx = (s.idx + 1) % 3;
      }
      const latestIdx = (s.idx + 2) % 3;
      const finalTex = s.texs[latestIdx];
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.viewport(0, 0, W, H);
      gl.useProgram(s.rndProg);
      gl.bindVertexArray(s.vao);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, finalTex);
      gl.uniform1i(s.rndLocs.curr, 0);
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, s.maskTex);
      gl.uniform1i(s.rndLocs.mask, 1);
      const ar = p.accent.r / 255;
      const ag = p.accent.g / 255;
      const ab = p.accent.b / 255;
      const bg = p.dark ? 0 : 1;
      const wall = p.dark ? 1 : 0;
      gl.uniform3f(s.rndLocs.accent, ar, ag, ab);
      gl.uniform3f(s.rndLocs.bg, bg, bg, bg);
      gl.uniform3f(s.rndLocs.wall, wall, wall, wall);
      gl.uniform1f(s.rndLocs.gain, p.gain);
      gl.uniform1f(s.rndLocs.reflect, p.reflect);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
    };
    animId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animId);
  }, []);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * mask.width;
      const y = ((e.clientY - rect.top) / rect.height) * mask.height;
      if (x < 0 || y < 0 || x >= mask.width || y >= mask.height) return;
      const mx = Math.floor(x);
      const my = Math.floor(y);
      if (mask.types[my][mx] === 1) return;
      sourcesRef.current.push({
        x,
        y,
        born: performance.now(),
        phase: Math.random() * Math.PI * 2,
      });
    },
    [mask]
  );

  return (
    <canvas
      ref={canvasRef}
      onPointerDown={handlePointerDown}
      className="fill"
      style={{
        imageRendering: "pixelated",
        display: "block",
        cursor: "crosshair",
        touchAction: "none",
      }}
    />
  );
}
