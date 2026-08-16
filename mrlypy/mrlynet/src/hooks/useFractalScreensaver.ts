import { useRef, useEffect, type RefObject } from "react";
import type { Viewport, Wayfinder } from "../mrly";
import { fitViewport, autoMaxIter, VERTEX_SOURCE, createShader, createProgram, setupQuad } from "../mrly";

// SHARED CONSTANTS

const MAX_DPR = 2;
const CYCLE_DURATION = 65536;
const FADE_DURATION = 2048;
const MAX_CYCLE_ZOOM = 128;
const ROTATION_SPEED = 1 / 2048;
const COLOR_SPEED = 1 / 256;
const START_SCALE = 1 / 2;

export interface FractalScreensaverConfig {
  fragSource: string;
  defaultViewport: Viewport;
  wayfinder: Wayfinder;
  extraUniforms?: (gl: WebGL2RenderingContext, program: WebGLProgram) => void;
  mode: boolean;
  colors: { r: number; g: number; b: number }[];
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function useFractalScreensaver(config: FractalScreensaverConfig): RefObject<HTMLCanvasElement | null> {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const configRef = useRef(config);
  configRef.current = config;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
    let w = Math.round(canvas.clientWidth * dpr);
    let h = Math.round(canvas.clientHeight * dpr);
    canvas.width = w;
    canvas.height = h;
    const gl = canvas.getContext("webgl2", { powerPreference: "low-power" })!;
    const { fragSource } = configRef.current;
    const vs = createShader(gl, gl.VERTEX_SHADER, VERTEX_SOURCE);
    const fs = createShader(gl, gl.FRAGMENT_SHADER, fragSource);
    const prog = createProgram(gl, vs, fs);
    const { vao, buffer } = setupQuad(gl, prog);
    gl.useProgram(prog);
    // UNIFORMS
    const loc = {
      resolution: gl.getUniformLocation(prog, "u_resolution"),
      viewport: gl.getUniformLocation(prog, "u_viewport"),
      maxIter: gl.getUniformLocation(prog, "u_maxIter"),
      primary: gl.getUniformLocation(prog, "u_primary"),
      accent: gl.getUniformLocation(prog, "u_accent"),
      rotation: gl.getUniformLocation(prog, "u_rotation"),
      time: gl.getUniformLocation(prog, "u_time"),
    };
    // START VIEWPORT
    const computeStartVp = () => {
      const dv = configRef.current.defaultViewport;
      const cx = (dv.xMin + dv.xMax) / 2;
      const cy = (dv.yMin + dv.yMax) / 2;
      const expand = 1 / START_SCALE;
      const hw = ((dv.xMax - dv.xMin) * expand) / 2;
      const hh = ((dv.yMax - dv.yMin) * expand) / 2;
      return fitViewport({ xMin: cx - hw, xMax: cx + hw, yMin: cy - hh, yMax: cy + hh }, w, h);
    };
    // CYCLE STATE
    let startVp = computeStartVp();
    let target = configRef.current.wayfinder.pick(startVp);
    let accent = pickRandom(configRef.current.colors);
    let rotDir = Math.random() < 0.5 ? 1 : -1;
    let cycleStart = performance.now();
    let rotation = Math.random() * Math.PI * 2;
    let colorTime = 0;
    let animId = 0;
    const startCycle = () => {
      startVp = computeStartVp();
      target = configRef.current.wayfinder.pick(startVp);
      accent = pickRandom(configRef.current.colors);
      rotDir = Math.random() < 0.5 ? 1 : -1;
      cycleStart = performance.now();
    };
    // RENDER LOOP
    const render = () => {
      const { mode, extraUniforms } = configRef.current;
      const elapsed = performance.now() - cycleStart;
      // RESTART
      if (elapsed >= CYCLE_DURATION) startCycle();
      const t = (performance.now() - cycleStart) / CYCLE_DURATION;
      // FADE
      const fadeIn = Math.min((performance.now() - cycleStart) / FADE_DURATION, 1);
      const fadeOut = Math.min((CYCLE_DURATION - (performance.now() - cycleStart)) / FADE_DURATION, 1);
      const opacity = Math.max(0, Math.min(fadeIn, fadeOut));
      canvas.style.opacity = String(opacity);
      if (opacity < 0.01) {
        animId = requestAnimationFrame(render);
        return;
      }
      // ZOOM
      const zoomLevel = Math.pow(MAX_CYCLE_ZOOM, t);
      const svw = startVp.xMax - startVp.xMin;
      const svh = startVp.yMax - startVp.yMin;
      const vw = svw / zoomLevel;
      const vh = svh / zoomLevel;
      const viewport: Viewport = {
        xMin: target.x - vw / 2,
        xMax: target.x + vw / 2,
        yMin: target.y - vh / 2,
        yMax: target.y + vh / 2,
      };
      // ANIMATE
      rotation += ROTATION_SPEED * rotDir;
      colorTime += COLOR_SPEED;
      // DRAW
      const maxIter = autoMaxIter(zoomLevel);
      const primary: [number, number, number] = mode ? [0, 0, 0] : [1, 1, 1];
      const ac: [number, number, number] = [accent.r / 255, accent.g / 255, accent.b / 255];
      gl.viewport(0, 0, w, h);
      gl.uniform2f(loc.resolution, w, h);
      gl.uniform4f(loc.viewport, viewport.xMin, viewport.xMax, viewport.yMin, viewport.yMax);
      gl.uniform1i(loc.maxIter, maxIter);
      gl.uniform3f(loc.primary, ...primary);
      gl.uniform3f(loc.accent, ...ac);
      gl.uniform1f(loc.rotation, rotation);
      gl.uniform1f(loc.time, colorTime);
      extraUniforms?.(gl, prog);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
      animId = requestAnimationFrame(render);
    };
    animId = requestAnimationFrame(render);
    // RESIZE
    const onResize = () => {
      const ndpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
      w = Math.round(canvas.clientWidth * ndpr);
      h = Math.round(canvas.clientHeight * ndpr);
      canvas.width = w;
      canvas.height = h;
      startVp = computeStartVp();
    };
    window.addEventListener("resize", onResize);
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", onResize);
      gl.deleteBuffer(buffer);
      gl.deleteVertexArray(vao);
      gl.deleteProgram(prog);
      gl.deleteShader(fs);
      gl.deleteShader(vs);
    };
  }, []);
  return canvasRef;
}
