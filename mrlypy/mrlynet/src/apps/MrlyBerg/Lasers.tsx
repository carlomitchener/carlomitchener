import { useCallback, useEffect, useMemo, useRef } from "react";
import type { Mask } from "./mask";

// TYPES

interface Emitter {
  x: number;
  y: number;
  dir: number;
  omega: number;
  spread: number;
  rays: number;
  bounces: number;
}

export interface LasersProps {
  mask: Mask;
  accent: { r: number; g: number; b: number };
  dark: boolean;
  paused: boolean;
  rays: number;
  spread: number;
  bounces: number;
  omega: number;
  epoch: number;
}

// HELPERS

function inWall(mask: Mask, x: number, y: number): boolean {
  if (x < 0 || y < 0 || x >= mask.width || y >= mask.height) return true;
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  return mask.types[iy][ix] === 1;
}

function traceRay(mask: Mask, x: number, y: number, dir: number, bounces: number, ctx: CanvasRenderingContext2D) {
  let dx = Math.cos(dir);
  let dy = Math.sin(dir);
  const stepSize = 0.5;
  const maxSteps = (mask.width + mask.height) * 4;
  ctx.beginPath();
  ctx.moveTo(x, y);
  let bouncesLeft = bounces;
  for (let i = 0; i < maxSteps; i++) {
    const nx = x + dx * stepSize;
    const ny = y + dy * stepSize;
    if (nx < 0 || ny < 0 || nx >= mask.width || ny >= mask.height) {
      ctx.lineTo(nx, ny);
      break;
    }
    const wxn = inWall(mask, nx, y);
    const wyn = inWall(mask, x, ny);
    if (wxn || wyn) {
      ctx.lineTo(x, y);
      if (wxn && wyn) {
        dx = -dx;
        dy = -dy;
      } else if (wxn) {
        dx = -dx;
      } else {
        dy = -dy;
      }
      bouncesLeft--;
      if (bouncesLeft < 0) break;
      ctx.moveTo(x, y);
      continue;
    }
    x = nx;
    y = ny;
  }
  if (bouncesLeft >= 0) ctx.lineTo(x, y);
  ctx.stroke();
}

function makeBaseLayer(mask: Mask, dark: boolean): HTMLCanvasElement {
  const off = document.createElement("canvas");
  off.width = mask.width;
  off.height = mask.height;
  const ctx = off.getContext("2d")!;
  ctx.fillStyle = dark ? "rgb(0,0,0)" : "rgb(255,255,255)";
  ctx.fillRect(0, 0, mask.width, mask.height);
  ctx.fillStyle = dark ? "rgb(255,255,255)" : "rgb(0,0,0)";
  for (let y = 0; y < mask.height; y++) {
    const row = mask.types[y];
    for (let x = 0; x < mask.width; x++) {
      if (row[x] === 1) ctx.fillRect(x, y, 1, 1);
    }
  }
  return off;
}

// COMPONENT

export function Lasers(props: LasersProps) {
  const { mask, epoch, dark } = props;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const propsRef = useRef(props);
  propsRef.current = props;
  const emittersRef = useRef<Emitter[]>([]);
  const lastTimeRef = useRef(0);
  const baseLayer = useMemo(() => makeBaseLayer(mask, dark), [mask, dark]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = mask.width;
    canvas.height = mask.height;
  }, [mask]);

  useEffect(() => {
    emittersRef.current = [];
  }, [epoch, mask]);

  useEffect(() => {
    let animId = 0;
    const tick = (now: number) => {
      animId = requestAnimationFrame(tick);
      const canvas = canvasRef.current;
      const p = propsRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const dt = lastTimeRef.current === 0 ? 0 : (now - lastTimeRef.current) / 1000;
      lastTimeRef.current = now;
      ctx.globalCompositeOperation = "source-over";
      ctx.drawImage(baseLayer, 0, 0);
      ctx.globalCompositeOperation = p.dark ? "lighter" : "multiply";
      ctx.lineWidth = Math.max(1, mask.width / 200);
      const ar = p.accent.r;
      const ag = p.accent.g;
      const ab = p.accent.b;
      const alpha = Math.max(0.35, Math.min(0.95, 8 / Math.max(1, p.rays)));
      ctx.strokeStyle = `rgba(${ar}, ${ag}, ${ab}, ${alpha})`;
      for (const em of emittersRef.current) {
        if (!p.paused) em.dir += em.omega * dt;
        const base = em.dir;
        const half = em.spread / 2;
        for (let i = 0; i < em.rays; i++) {
          const t = em.rays === 1 ? 0.5 : i / (em.rays - 1);
          const a = base - half + em.spread * t;
          traceRay(mask, em.x, em.y, a, em.bounces, ctx);
        }
      }
      ctx.globalCompositeOperation = "source-over";
    };
    animId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animId);
  }, [mask, baseLayer]);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * mask.width;
      const y = ((e.clientY - rect.top) / rect.height) * mask.height;
      if (inWall(mask, x, y)) return;
      const p = propsRef.current;
      emittersRef.current.push({
        x,
        y,
        dir: Math.random() * Math.PI * 2,
        omega: p.omega,
        spread: p.spread,
        rays: p.rays,
        bounces: p.bounces,
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
