import { useState, useEffect, useRef } from "react";
import { useTheme } from "../../contexts/ThemeContext";
import { MrlyTile, getMrlyStyle } from "../../components/MrlyTile";
import { OverlayBox } from "../../components/System";

interface MrlySleepProps {
  onWake?: () => void;
  [key: string]: unknown;
}

export function MrlySleep({ onWake }: MrlySleepProps) {
  const { refreshColors } = useTheme();
  const [style, setStyle] = useState(getMrlyStyle());
  const pos = useRef<{ x: number; y: number } | null>(null);
  const velocity = useRef({ x: 4, y: 4 });
  const boxRef = useRef<HTMLDivElement>(null);
  const requestRef = useRef<number>(0);

  useEffect(() => {
    if (!pos.current) {
      pos.current = {
        x: Math.random() * (window.innerWidth - 100),
        y: Math.random() * (window.innerHeight - 100),
      };
    }

    const update = () => {
      if (!boxRef.current || !pos.current) return;
      const vmin = Math.min(window.innerWidth, window.innerHeight);
      const size = vmin * 0.15;
      let { x, y } = pos.current;
      let { x: vx, y: vy } = velocity.current;
      x += vx;
      y += vy;
      const maxX = window.innerWidth - size;
      const maxY = window.innerHeight - size;
      let bounced = false;
      if (x <= 0) {
        x = 0;
        vx = Math.abs(vx);
        bounced = true;
      } else if (x >= maxX) {
        x = maxX;
        vx = -Math.abs(vx);
        bounced = true;
      }
      if (y <= 0) {
        y = 0;
        vy = Math.abs(vy);
        bounced = true;
      } else if (y >= maxY) {
        y = maxY;
        vy = -Math.abs(vy);
        bounced = true;
      }
      if (bounced) {
        refreshColors();
        setStyle(getMrlyStyle());
      }
      pos.current = { x, y };
      velocity.current = { x: vx, y: vy };
      boxRef.current.style.transform = `translate(${x}px, ${y}px)`;
      boxRef.current.style.width = `${size}px`;
      boxRef.current.style.height = `${size}px`;
      requestRef.current = requestAnimationFrame(update);
    };
    requestRef.current = requestAnimationFrame(update);
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [refreshColors]);

  return (
    <OverlayBox onClick={onWake} style={{ background: "transparent", pointerEvents: "auto" }}>
      <div ref={boxRef} style={{ position: "absolute", top: 0, left: 0 }}>
        <MrlyTile {...style} />
      </div>
    </OverlayBox>
  );
}
