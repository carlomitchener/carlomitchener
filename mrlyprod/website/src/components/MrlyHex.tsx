import React, { useMemo } from "react";
import { generate3d, iso, pro, cut, getHexTriangles, getHexBounds, type HexColorMap } from "../lib/fractal";

export type { HexColorMap };

interface HexProps {
  design: string;
  number: number;
  level: number;
  view: "iso" | "pro" | "cut";
  colors: HexColorMap;
  style?: React.CSSProperties;
}

export const MrlyHex = React.memo(({ design, number, level, view, colors, style }: HexProps) => {
  const sponge = useMemo(() => generate3d(design, number, level), [design, number, level]);

  const grid = useMemo(() => {
    if (view === "iso") return iso(sponge);
    if (view === "pro") return pro(sponge);
    if (view === "cut") return cut(sponge);
    return null;
  }, [sponge, view]);

  const triangles = useMemo(() => {
    if (!grid || grid.width === 0) return [];
    const start = view === "iso" || view === "pro" ? 1 : 0;
    return getHexTriangles(grid, colors, start);
  }, [grid, colors, view]);

  const viewBox = useMemo(() => {
    if (triangles.length === 0) return "0 0 100 100";
    const { minX, minY, width, height } = getHexBounds(triangles);
    return `${minX} ${minY} ${width} ${height}`;
  }, [triangles]);

  return (
    <div className="fill" style={style}>
      <svg viewBox={viewBox} className="fill" shapeRendering="crispEdges">
        {triangles.map((t, i) => (
          <polygon
            key={i}
            points={t.points.map((p: [number, number]) => p.join(",")).join(" ")}
            fill={t.color}
            stroke="none"
          />
        ))}
      </svg>
    </div>
  );
});

MrlyHex.displayName = "MrlyHex";
