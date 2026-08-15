import { Color, type RGBA } from "../../mrly/colors";
import { Cell2d } from "../../mrly/two/models";
import { getOrientation, Orientation, isHex, tile } from "../../mrly/six/geometry";

// TRIANGLES

export function triangleNorth(x: number, y: number): [number, number][] {
  return [
    [x, 2 * y + 2],
    [x + 1, 2 * y],
    [x + 2, 2 * y + 2],
  ];
}

export function triangleSouth(x: number, y: number): [number, number][] {
  return [
    [x, 2 * y],
    [x + 1, 2 * y + 2],
    [x + 2, 2 * y],
  ];
}

export function triangleEast(x: number, y: number): [number, number][] {
  return [
    [2 * x, y],
    [2 * x, y + 2],
    [2 * x + 2, y + 1],
  ];
}

export function triangleWest(x: number, y: number): [number, number][] {
  return [
    [2 * x + 2, y],
    [2 * x + 2, y + 2],
    [2 * x, y + 1],
  ];
}

type Triangle = { points: [number, number][]; color: RGBA };

export function getTriangles(cell: Cell2d, start: number = 0): Triangle[] {
  const height = cell.height;
  const widthGrid = cell.width;
  const orient = getOrientation(widthGrid, height);
  const colorsGrid = cell.colors;
  const triangles: Triangle[] = [];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < widthGrid; x++) {
      const [r, g, b, a] = colorsGrid[y][x];
      if (a === 0) continue;
      const flip = (x + y + start) % 2;
      let points: [number, number][];
      if (orient === Orientation.HORIZONTAL) {
        points = flip === 0 ? triangleNorth(x, y) : triangleSouth(x, y);
      } else {
        points = flip === 0 ? triangleEast(x, y) : triangleWest(x, y);
      }
      triangles.push({ points, color: [r, g, b, a] });
    }
  }
  return triangles;
}

// SVG

export function svg(
  cell: Cell2d,
  scale: number = 1,
  start: number = 0,
  outline?: Color,
  outlineWidth: number = 1
): string {
  const triangles = getTriangles(cell, start);
  if (triangles.length === 0) return "<svg></svg>";
  const allX = triangles.flatMap((t) => t.points.map((p) => p[0]));
  const allY = triangles.flatMap((t) => t.points.map((p) => p[1]));
  const minX = Math.min(...allX);
  const maxX = Math.max(...allX);
  const minY = Math.min(...allY);
  const maxY = Math.max(...allY);
  const padding = outline ? outlineWidth : 0;
  const imgWidth = (maxX - minX + padding * 2) * scale;
  const imgHeight = (maxY - minY + padding * 2) * scale;
  const offsetX = -minX + padding;
  const offsetY = -minY + padding;
  const elements: string[] = [`<svg width="${imgWidth}" height="${imgHeight}" xmlns="http://www.w3.org/2000/svg">`];
  for (const tri of triangles) {
    const [r, g, b, a] = tri.color;
    const fill = Color.rgbaToHex(r, g, b, a);
    const ptsStr = tri.points.map((p) => `${(p[0] + offsetX) * scale},${(p[1] + offsetY) * scale}`).join(" ");
    let strokeAttr = "";
    if (outline) {
      strokeAttr = ` stroke="${outline.toHex()}" stroke-width="${outlineWidth}"`;
    }
    elements.push(`<polygon points="${ptsStr}" fill="${fill}"${strokeAttr}/>`);
  }
  elements.push("</svg>");
  return elements.join("\n");
}

// RECT

export function rectSvg(cell: Cell2d, scale: number = 1, start: number = 0): string {
  if (!isHex(cell)) throw new Error("Cell must be a hexagon.");
  const tiledCell = tile(cell, 3, 3);
  const tileH = cell.height;
  const tileW = cell.width;
  const orient = getOrientation(tileW, tileH);
  let geomCropW: number, geomCropH: number, startGeomX: number, startGeomY: number;
  if (orient === Orientation.HORIZONTAL) {
    const dxVal = Math.floor((3 * (tileW + 1)) / 4);
    const dyVal = tileH;
    geomCropW = 2 * dxVal;
    geomCropH = 2 * dyVal;
    startGeomX = Math.floor((tileW + 1) / 2);
    startGeomY = tileH;
  } else {
    const dxVal = tileW;
    const dyVal = Math.floor((3 * (tileH + 1)) / 4);
    geomCropW = 2 * dxVal;
    geomCropH = 2 * dyVal;
    startGeomX = tileW;
    startGeomY = Math.floor((tileH + 1) / 2);
  }
  const triangles = getTriangles(tiledCell, start);
  const imgWidth = geomCropW * scale;
  const imgHeight = geomCropH * scale;
  const offsetX = -startGeomX;
  const offsetY = -startGeomY;
  const elements: string[] = [
    `<svg width="${imgWidth}" height="${imgHeight}" viewBox="0 0 ${imgWidth} ${imgHeight}" xmlns="http://www.w3.org/2000/svg">`,
  ];
  for (const tri of triangles) {
    const [r, g, b, a] = tri.color;
    const fill = Color.rgbaToHex(r, g, b, a);
    const ptsStr = tri.points.map((p) => `${(p[0] + offsetX) * scale},${(p[1] + offsetY) * scale}`).join(" ");
    elements.push(`<polygon points="${ptsStr}" fill="${fill}" stroke="none"/>`);
  }
  elements.push("</svg>");
  return elements.join("\n");
}
