import * as mj from "../mrly";
import { getTriangles as hexGetTriangles, svg as hexSvg } from "./render/six";

// TYPES

export type HexColorMap = { [key: number]: mj.Color };

// PATTERN MAPS

const patterns2d: Record<string, (n: number) => number[][]> = {
  carpet: mj.binary.carpet2d,
  net: mj.binary.net2d,
  htree: mj.binary.tree2d,
  vtree: (n) => mj.binary.rotate2d(mj.binary.tree2d(n), 1),
  void: mj.binary.void2d,
};

const patterns3d: Record<string, (n: number) => number[][][]> = {
  carpet: mj.binary.carpet3d,
  net: mj.binary.net3d,
  tree: mj.binary.tree3d,
  void: mj.binary.void3d,
};

// GENERATORS

export function generate(design: string, number: number, level: number): number[][] {
  const pattern = patterns2d[design]?.(number) ?? [[1]];
  return mj.binary.fractal2d(pattern, level);
}

export function generate3d(design: string, number: number, level: number): number[][][] {
  const pattern = patterns3d[design]?.(number) ?? [[[1]]];
  return mj.binary.fractal3d(pattern, level);
}

export function invert3d(grid: number[][][]): number[][][] {
  return mj.binary.invert3d(grid);
}

// HEX PROJECTIONS

export function iso(grid: number[][][]): mj.Cell2d {
  return mj.hex.iso(mj.Cell3d.fromList(grid));
}

export function pro(grid: number[][][]): mj.Cell2d {
  return mj.hex.pro(mj.Cell3d.fromList(grid));
}

export function cut(grid: number[][][]): mj.Cell2d {
  return mj.hex.cut(mj.Cell3d.fromList(grid));
}

// HEX COLORS

function paintCell(cell: mj.Cell2d, colors: HexColorMap): mj.Cell2d {
  const painted = cell.copy();
  painted.colors = painted.types.map((row) =>
    row.map((type) => (colors[type] ? colors[type].toRGBA() : ([0, 0, 0, 0] as [number, number, number, number])))
  );
  return painted;
}

// HEX TRIANGLES

export function getHexTriangles(
  cell: mj.Cell2d,
  colors: HexColorMap,
  start: number
): { points: [number, number][]; color: string }[] {
  const painted = paintCell(cell, colors);
  return hexGetTriangles(painted, start).map((t) => ({
    points: t.points,
    color: `rgba(${t.color[0]},${t.color[1]},${t.color[2]},${t.color[3] / 255})`,
  }));
}

// HEX BOUNDS

export function getHexBounds(triangles: { points: [number, number][] }[]) {
  if (triangles.length === 0) return { minX: 0, minY: 0, width: 100, height: 100 };
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;
  for (const t of triangles) {
    for (const p of t.points) {
      if (p[0] < minX) minX = p[0];
      if (p[0] > maxX) maxX = p[0];
      if (p[1] < minY) minY = p[1];
      if (p[1] > maxY) maxY = p[1];
    }
  }
  return { minX, minY, width: maxX - minX, height: maxY - minY };
}

// 2D RENDERERS

export function render(canvas: HTMLCanvasElement, grid: number[][], fillColor: mj.Color, voidColor: mj.Color) {
  const size = grid.length;
  const scale = canvas.width / size;
  const ctx = canvas.getContext("2d")!;
  if (voidColor.a > 0) {
    ctx.fillStyle = voidColor.toCSS();
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
  ctx.fillStyle = fillColor.toCSS();
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (grid[y][x] === 1) ctx.fillRect(x * scale, y * scale, scale, scale);
    }
  }
}

export function toPNG(canvas: HTMLCanvasElement): string {
  return canvas.toDataURL("image/png");
}

export function toSVG(grid: number[][], fillColor: mj.Color, voidColor: mj.Color): string {
  const size = grid.length;
  const scale = 10;
  const fillHex = fillColor.toHex();
  const voidHex = voidColor.toHex();
  const rects: string[] = [];
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (grid[y][x] === 1)
        rects.push(`<rect x="${x * scale}" y="${y * scale}" width="${scale}" height="${scale}" fill="${fillHex}"/>`);
    }
  }
  const bgRect = voidColor.a > 0 ? `<rect width="100%" height="100%" fill="${voidHex}"/>` : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size * scale}" height="${size * scale}">${bgRect}${rects.join("")}</svg>`;
}

// 3D RENDERER

export function toOBJ(grid: number[][][]): string {
  return mj.toOBJ(mj.Cell3d.fromList(grid));
}

// HEX RENDERERS

export function renderHex(canvas: HTMLCanvasElement, cell: mj.Cell2d, colors: HexColorMap, start: number) {
  const painted = paintCell(cell, colors);
  const triangles = hexGetTriangles(painted, start);
  if (triangles.length === 0) return;
  const ctx = canvas.getContext("2d")!;
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;
  for (const t of triangles) {
    for (const p of t.points) {
      if (p[0] < minX) minX = p[0];
      if (p[0] > maxX) maxX = p[0];
      if (p[1] < minY) minY = p[1];
      if (p[1] > maxY) maxY = p[1];
    }
  }
  const svgW = maxX - minX;
  const svgH = maxY - minY;
  const scale = Math.min(canvas.width / svgW, canvas.height / svgH);
  const dx = (canvas.width - svgW * scale) / 2;
  const dy = (canvas.height - svgH * scale) / 2;
  for (const t of triangles) {
    const [r, g, b, a] = t.color;
    ctx.fillStyle = `rgba(${r},${g},${b},${a / 255})`;
    ctx.beginPath();
    ctx.moveTo((t.points[0][0] - minX) * scale + dx, (t.points[0][1] - minY) * scale + dy);
    for (let i = 1; i < t.points.length; i++) {
      ctx.lineTo((t.points[i][0] - minX) * scale + dx, (t.points[i][1] - minY) * scale + dy);
    }
    ctx.closePath();
    ctx.fill();
  }
}

export function toSVGHex(cell: mj.Cell2d, colors: HexColorMap, start: number, bg?: string): string {
  const painted = paintCell(cell, colors);
  const svgContent = hexSvg(painted, 10, start);
  if (bg) {
    return svgContent.replace(/(<svg[^>]*>)/, `$1<rect width="100%" height="100%" fill="${bg}"/>`);
  }
  return svgContent;
}

// CONSTANTS

export const VOID = mj.hex.VOID;
export const FILL = mj.hex.FILL;
export const GRID = mj.hex.GRID;
export const UP = mj.hex.UP;
export const LEFT = mj.hex.LEFT;
export const RIGHT = mj.hex.RIGHT;
