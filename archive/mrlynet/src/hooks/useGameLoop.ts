import { useEffect, useRef } from "react";

export function useGameLoop(callback: (deltaTime: number) => void, fps: number = 60, isRunning: boolean = true) {
  const frameRef = useRef<number>(0);
  const lastTickRef = useRef<number>(0);
  const callbackRef = useRef(callback);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    if (!isRunning) return;
    const intervalMs = 1000 / fps;
    const tick = (time: number) => {
      const delta = time - lastTickRef.current;
      if (delta >= intervalMs) {
        lastTickRef.current = time;
        callbackRef.current(delta);
      }
      frameRef.current = requestAnimationFrame(tick);
    };
    frameRef.current = requestAnimationFrame(tick);
    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, [fps, isRunning]);
}
