import { useEffect, useCallback } from "react";
import { GridBox, LinkBox, ListBox } from "./System";
import { MrlyIcon } from "./MrlyIcon";

type Direction = "UP" | "DOWN" | "LEFT" | "RIGHT";

interface KeypadProps {
  onDirection: (direction: Direction) => void;
  disabled?: boolean;
}

export const Keypad = ({ onDirection, disabled }: KeypadProps) => {
  const handleDirection = useCallback(
    (direction: Direction) => {
      if (!disabled) onDirection(direction);
    },
    [onDirection, disabled]
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (disabled) return;
      const keyMap: Record<string, Direction> = {
        ArrowUp: "UP",
        ArrowDown: "DOWN",
        ArrowLeft: "LEFT",
        ArrowRight: "RIGHT",
        w: "UP",
        W: "UP",
        s: "DOWN",
        S: "DOWN",
        a: "LEFT",
        A: "LEFT",
        d: "RIGHT",
        D: "RIGHT",
      };
      const direction = keyMap[e.key];
      if (direction) {
        e.preventDefault();
        handleDirection(direction);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [disabled, handleDirection]);

  return (
    <GridBox cols={3}>
      <LinkBox onClick={() => handleDirection("LEFT")} disabled={disabled} silent style={{ height: "100%" }}>
        <MrlyIcon text="←" />
      </LinkBox>
      <ListBox>
        <LinkBox onClick={() => handleDirection("UP")} disabled={disabled} silent>
          <MrlyIcon text="↑" />
        </LinkBox>
        <LinkBox onClick={() => handleDirection("DOWN")} disabled={disabled} silent>
          <MrlyIcon text="↓" />
        </LinkBox>
      </ListBox>
      <LinkBox onClick={() => handleDirection("RIGHT")} disabled={disabled} silent style={{ height: "100%" }}>
        <MrlyIcon text="→" />
      </LinkBox>
    </GridBox>
  );
};

export type { Direction };
