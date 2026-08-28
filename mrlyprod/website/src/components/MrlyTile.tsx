import React from "react";
import { randomColorName } from "../lib/colors.js";
import { MRLY_DESIGNS, MRLY_NUMBERS } from "../mrly";
import { getTileUrl } from "../lib/tiles.js";

export interface TileStyle {
  design: string;
  number: number;
  color: string;
  voidColor?: string;
}

interface TileProps extends TileStyle {
  clipPath?: string;
}

export const MrlyTile = React.memo(({ design, number, color, voidColor, clipPath }: TileProps) => {
  const src = getTileUrl(design, number, color, voidColor);
  return (
    <div className="fill" style={{ clipPath }}>
      <img src={src} className="fill" style={{ imageRendering: "pixelated" }} />
    </div>
  );
});

MrlyTile.displayName = "MrlyTile";

export interface MrlyStyleOptions {
  design?: string;
}

export function getMrlyStyle(options: MrlyStyleOptions = {}): TileStyle {
  const design = options.design || MRLY_DESIGNS[Math.floor(Math.random() * MRLY_DESIGNS.length)];
  const number = MRLY_NUMBERS[Math.floor(Math.random() * MRLY_NUMBERS.length)];
  return { design, number, color: randomColorName() };
}
