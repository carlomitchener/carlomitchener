import { useEffect, useRef, useState } from "react";
import { useTheme } from "../../contexts/ThemeContext";
import { randomColor, POOL } from "../../lib/colors";
import { OverlayBox } from "../../components/System";

interface MrlyMatrixProps {
  onWake?: () => void;
  [key: string]: unknown;
}

export function MrlyMatrix({ onWake }: MrlyMatrixProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [initialColor] = useState<string | null>(() =>
    Math.floor(Math.random() * (POOL.length + 1)) === POOL.length ? null : randomColor()
  );
  const colorRef = useRef(initialColor);
  const { mode } = useTheme();
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let width = window.innerWidth;
    let height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;
    const fontSize = 20;
    const columns = Math.ceil(width / fontSize);
    const drops: number[] = new Array(columns).fill(1);
    const pickColor = () => colorRef.current ?? randomColor();
    const dropColors: string[] = new Array(columns).fill(0).map(() => pickColor());
    const chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const draw = () => {
      ctx.fillStyle = mode ? "rgba(0, 0, 0, 0.05)" : "rgba(255, 255, 255, 0.05)";
      ctx.fillRect(0, 0, width, height);
      ctx.font = `${fontSize}px MrlyFont, monospace`;
      for (let i = 0; i < drops.length; i++) {
        ctx.fillStyle = dropColors[i];
        const text = chars.charAt(Math.floor(Math.random() * chars.length));
        const x = i * fontSize;
        const y = drops[i] * fontSize;
        ctx.fillText(text, x, y);
        if (y > height && Math.random() > 0.975) {
          drops[i] = 0;
          dropColors[i] = pickColor();
        }
        drops[i]++;
      }
    };
    const interval = setInterval(draw, 33);
    const handleResize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width;
      canvas.height = height;
      const newCols = Math.ceil(width / fontSize);
      if (newCols > drops.length) {
        for (let i = drops.length; i < newCols; i++) {
          drops[i] = Math.random() * (height / fontSize);
          dropColors[i] = pickColor();
        }
      }
    };
    window.addEventListener("resize", handleResize);
    return () => {
      clearInterval(interval);
      window.removeEventListener("resize", handleResize);
    };
  }, [mode]);
  return (
    <OverlayBox onClick={onWake} style={{ backgroundColor: mode ? "black" : "white" }}>
      <canvas ref={canvasRef} style={{ display: "block" }} />
    </OverlayBox>
  );
}
