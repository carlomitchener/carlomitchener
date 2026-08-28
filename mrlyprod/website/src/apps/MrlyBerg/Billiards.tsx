import { useCallback, useEffect, useMemo, useRef } from "react";
import type { Mask } from "./mask";

// TYPES

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  hue: number;
}

export interface BilliardsProps {
  mask: Mask;
  accent: { r: number; g: number; b: number };
  dark: boolean;
  paused: boolean;
  speed: number;
  trail: number;
  size: number;
  count: number;
  epoch: number;
}

// HELPERS

function inWall(mask: Mask, x: number, y: number): boolean {
  if (x < 0 || y < 0 || x >= mask.width || y >= mask.height) return true;
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  return mask.types[iy][ix] === 1;
}

function makeWallLayer(mask: Mask, dark: boolean): HTMLCanvasElement {
  const off = document.createElement("canvas");
  off.width = mask.width;
  off.height = mask.height;
  const ctx = off.getContext("2d")!;
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

export function Billiards(props: BilliardsProps) {
  const { mask, epoch, dark } = props;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const propsRef = useRef(props);
  propsRef.current = props;
  const particlesRef = useRef<Particle[]>([]);
  const wallLayer = useMemo(() => makeWallLayer(mask, dark), [mask, dark]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = mask.width;
    canvas.height = mask.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = props.dark ? "#000" : "#fff";
    ctx.fillRect(0, 0, mask.width, mask.height);
  }, [mask, props.dark]);

  useEffect(() => {
    particlesRef.current = [];
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.fillStyle = propsRef.current.dark ? "#000" : "#fff";
        ctx.fillRect(0, 0, mask.width, mask.height);
      }
    }
  }, [epoch, mask]);

  useEffect(() => {
    let animId = 0;
    const tick = () => {
      animId = requestAnimationFrame(tick);
      const canvas = canvasRef.current;
      const p = propsRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const W = mask.width;
      const H = mask.height;
      const bgR = p.dark ? 0 : 255;
      ctx.fillStyle = `rgba(${bgR}, ${bgR}, ${bgR}, ${p.trail})`;
      ctx.fillRect(0, 0, W, H);
      ctx.drawImage(wallLayer, 0, 0);
      if (!p.paused) {
        for (const part of particlesRef.current) {
          const dt = p.speed;
          let remaining = dt;
          let safety = 0;
          while (remaining > 0 && safety < 8) {
            safety++;
            const step = Math.min(remaining, 0.5);
            const nx = part.x + part.vx * step;
            const ny = part.y + part.vy * step;
            const wxn = inWall(mask, nx, part.y);
            const wyn = inWall(mask, part.x, ny);
            if (wxn && wyn) {
              part.vx = -part.vx;
              part.vy = -part.vy;
            } else if (wxn) {
              part.vx = -part.vx;
            } else if (wyn) {
              part.vy = -part.vy;
            } else {
              part.x = nx;
              part.y = ny;
            }
            remaining -= step;
          }
        }
      }
      const ar = p.accent.r;
      const ag = p.accent.g;
      const ab = p.accent.b;
      ctx.fillStyle = `rgb(${ar}, ${ag}, ${ab})`;
      const r = p.size;
      for (const part of particlesRef.current) {
        ctx.beginPath();
        ctx.arc(part.x, part.y, r, 0, Math.PI * 2);
        ctx.fill();
      }
    };
    animId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animId);
  }, [mask, wallLayer]);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * mask.width;
      const y = ((e.clientY - rect.top) / rect.height) * mask.height;
      if (inWall(mask, x, y)) return;
      const speed = 0.4;
      const n = Math.max(1, propsRef.current.count);
      const base = Math.random() * Math.PI * 2;
      for (let i = 0; i < n; i++) {
        const angle = base + (i * Math.PI * 2) / n;
        particlesRef.current.push({
          x,
          y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          hue: Math.random(),
        });
      }
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
