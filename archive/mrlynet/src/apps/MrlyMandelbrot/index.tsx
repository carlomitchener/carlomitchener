import { useState } from "react";
import { OverlayBox } from "../../components/System";
import { useTheme } from "../../contexts/ThemeContext";
import { POOL } from "../../lib/colors";
import { MANDELBROT_VIEWPORT as DEFAULT_VIEWPORT, MANDELBROT_FRAG, mandelbrotWayfinder } from "../../mrly";
import { useFractalScreensaver } from "../../hooks/useFractalScreensaver";

interface MrlyMandelbrotProps {
  onWake?: () => void;
  [key: string]: unknown;
}

export function MrlyMandelbrot({ onWake }: MrlyMandelbrotProps) {
  const { mode } = useTheme();
  const [wayfinder] = useState(() => mandelbrotWayfinder());
  const canvasRef = useFractalScreensaver({
    fragSource: MANDELBROT_FRAG,
    defaultViewport: DEFAULT_VIEWPORT,
    wayfinder,
    mode,
    colors: POOL,
  });
  return (
    <OverlayBox style={{ backgroundColor: mode ? "black" : "white" }} onClick={onWake}>
      <canvas ref={canvasRef} style={{ width: "100vw", height: "100vh", display: "block", touchAction: "none" }} />
    </OverlayBox>
  );
}
