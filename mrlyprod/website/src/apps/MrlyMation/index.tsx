import { useEffect, useRef } from "react";
import { useTheme } from "../../contexts/ThemeContext";
import { AnimationController } from "../../lib/animation";
import { OverlayBox } from "../../components/System";

interface Props {
  onWake?: () => void;
  [key: string]: unknown;
}

export function MrlyMation({ onWake }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const controllerRef = useRef<AnimationController | null>(null);
  const { mode } = useTheme();
  useEffect(() => {
    if (containerRef.current) {
      controllerRef.current = new AnimationController(containerRef.current, {
        bgColor: mode ? "black" : "white",
      });
      controllerRef.current.play();
    }
    return () => {
      if (controllerRef.current) {
        controllerRef.current.destroy();
        controllerRef.current = null;
      }
    };
  }, [mode]);
  return (
    <OverlayBox
      onClick={onWake}
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: mode ? "black" : "white",
      }}
    >
      <div ref={containerRef} />
    </OverlayBox>
  );
}
