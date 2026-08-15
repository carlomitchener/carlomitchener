import { useState } from "react";
import { LinkBox } from "./System";
import { SCREENSHOT_SIZES } from "../lib/browser/screenshot";

interface ScreenshotButtonProps {
  onSave: (size: number) => void;
  label?: string;
}

export function ScreenshotButton({ onSave, label = "PNG" }: ScreenshotButtonProps) {
  const [sizeIndex, setSizeIndex] = useState(1);
  const size = SCREENSHOT_SIZES[sizeIndex];
  return (
    <>
      <LinkBox onClick={() => onSave(size)}>{label}</LinkBox>
      <LinkBox onClick={() => setSizeIndex((i) => (i + 1) % SCREENSHOT_SIZES.length)}>{size}px</LinkBox>
    </>
  );
}
