import { useEffect, useRef } from "react";
import { useTheme } from "../contexts/ThemeContext";
import { AnimationController } from "../lib/animation";

export const MrlyProd = () => {
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
  return <div ref={containerRef} />;
};
