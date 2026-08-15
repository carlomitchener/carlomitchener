import { useState, useCallback } from "react";
import { OverlayBox } from "../../components/System";
import { useTheme } from "../../contexts/ThemeContext";
import { POOL } from "../../lib/colors";
import { JULIA_VIEWPORT as DEFAULT_VIEWPORT, JULIA_FRAG, JULIA_PRESETS as PRESETS, juliaWayfinder } from "../../mrly";
import { useFractalScreensaver } from "../../hooks/useFractalScreensaver";

interface MrlyJuliaProps {
  onWake?: () => void;
  [key: string]: unknown;
}

export function MrlyJulia({ onWake }: MrlyJuliaProps) {
  const { mode } = useTheme();
  const [preset] = useState(() => PRESETS[Math.floor(Math.random() * PRESETS.length)]);
  const [wayfinder] = useState(() => juliaWayfinder(preset.re, preset.im));
  const extraUniforms = useCallback(
    (gl: WebGL2RenderingContext, program: WebGLProgram) => {
      gl.uniform2f(gl.getUniformLocation(program, "u_c"), preset.re, preset.im);
    },
    [preset]
  );
  const canvasRef = useFractalScreensaver({
    fragSource: JULIA_FRAG,
    defaultViewport: DEFAULT_VIEWPORT,
    wayfinder,
    extraUniforms,
    mode,
    colors: POOL,
  });
  return (
    <OverlayBox style={{ backgroundColor: mode ? "black" : "white" }} onClick={onWake}>
      <canvas ref={canvasRef} style={{ width: "100vw", height: "100vh", display: "block", touchAction: "none" }} />
    </OverlayBox>
  );
}
