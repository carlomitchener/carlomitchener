import { Color } from "../../mrly/colors";
import type { Cell2d } from "../../mrly/two/models";

// TEXT

export function text2d(grid: number[][], mapping?: Record<number, string>): string[] {
  const rows: string[] = [];
  for (let y = 0; y < grid.length; y++) {
    let rowStr = "";
    for (let x = 0; x < grid[y].length; x++) {
      const val = grid[y][x];
      rowStr += mapping ? (mapping[val] ?? String(val)) : String(val);
    }
    rows.push(rowStr);
  }
  return rows;
}

// SVG

export interface SVGOptions {
  scale?: number;
  shape?: "square" | "circle" | "diamond";
  outline?: Color;
  outlineWidth?: number;
}

export function toSVG2d(cell: Cell2d, options: SVGOptions = {}): string {
  const scale = options.scale ?? 1;
  const shape = options.shape ?? "square";
  const outline = options.outline ?? null;
  const outlineWidth = options.outlineWidth ?? 1;
  const padding = outline ? outlineWidth : 0;
  const imgWidth = cell.width * scale + padding * 2;
  const imgHeight = cell.height * scale + padding * 2;
  const outlineHex = outline ? outline.toHex() : null;
  const strokeAttr = outlineHex ? `stroke="${outlineHex}" stroke-width="${outlineWidth}"` : 'stroke="none"';
  const elements: string[] = [`<svg width="${imgWidth}" height="${imgHeight}" xmlns="http://www.w3.org/2000/svg">`];
  const colorsGrid = cell.colors;
  for (let y = 0; y < cell.height; y++) {
    for (let x = 0; x < cell.width; x++) {
      const [r, g, b, a] = colorsGrid[y][x];
      if (a === 0) continue;
      const fill = Color.rgbaToHex(r, g, b, a);
      switch (shape) {
        case "square": {
          const rx = x * scale + padding;
          const ry = y * scale + padding;
          elements.push(`<rect x="${rx}" y="${ry}" width="${scale}" height="${scale}" fill="${fill}" ${strokeAttr}/>`);
          break;
        }
        case "circle": {
          const radius = scale / 2;
          const cx = x * scale + padding + radius;
          const cy = y * scale + padding + radius;
          elements.push(`<circle cx="${cx}" cy="${cy}" r="${radius}" fill="${fill}" ${strokeAttr}/>`);
          break;
        }
        case "diamond": {
          const hs = scale / 2;
          const dx = x * scale + padding;
          const dy = y * scale + padding;
          const pts = [
            `${dx + hs},${dy}`,
            `${dx + scale},${dy + hs}`,
            `${dx + hs},${dy + scale}`,
            `${dx},${dy + hs}`,
          ].join(" ");
          elements.push(`<polygon points="${pts}" fill="${fill}" ${strokeAttr}/>`);
          break;
        }
      }
    }
  }
  elements.push("</svg>");
  return elements.join("\n");
}

// CANVAS

export interface CanvasOptions {
  scale?: number;
  shape?: "square" | "circle" | "diamond";
  outline?: Color;
  outlineWidth?: number;
}

export function toCanvas2d(cell: Cell2d, ctx: CanvasRenderingContext2D, options: CanvasOptions = {}): void {
  const scale = options.scale ?? 1;
  const shape = options.shape ?? "square";
  const outline = options.outline ?? null;
  const outlineWidth = options.outlineWidth ?? 1;
  const padding = outline ? outlineWidth : 0;
  const colorsGrid = cell.colors;
  if (outline) {
    ctx.strokeStyle = outline.toCSS();
    ctx.lineWidth = outlineWidth;
  }
  for (let y = 0; y < cell.height; y++) {
    for (let x = 0; x < cell.width; x++) {
      const [r, g, b, a] = colorsGrid[y][x];
      if (a === 0) continue;
      ctx.fillStyle = `rgba(${r},${g},${b},${a / 255})`;
      switch (shape) {
        case "square": {
          const rx = x * scale + padding;
          const ry = y * scale + padding;
          ctx.fillRect(rx, ry, scale, scale);
          if (outline) ctx.strokeRect(rx, ry, scale, scale);
          break;
        }
        case "circle": {
          const radius = scale / 2;
          const cx = x * scale + padding + radius;
          const cy = y * scale + padding + radius;
          ctx.beginPath();
          ctx.arc(cx, cy, radius, 0, Math.PI * 2);
          ctx.fill();
          if (outline) ctx.stroke();
          break;
        }
        case "diamond": {
          const hs = scale / 2;
          const dx = x * scale + padding;
          const dy = y * scale + padding;
          ctx.beginPath();
          ctx.moveTo(dx + hs, dy);
          ctx.lineTo(dx + scale, dy + hs);
          ctx.lineTo(dx + hs, dy + scale);
          ctx.lineTo(dx, dy + hs);
          ctx.closePath();
          ctx.fill();
          if (outline) ctx.stroke();
          break;
        }
      }
    }
  }
}

// IMAGE DATA

export function toImageData2d(
  cell: Cell2d,
  scale: number = 1
): { width: number; height: number; data: Uint8ClampedArray } {
  const w = cell.width * scale;
  const h = cell.height * scale;
  const data = new Uint8ClampedArray(w * h * 4);
  const colorsGrid = cell.colors;
  for (let y = 0; y < cell.height; y++) {
    for (let x = 0; x < cell.width; x++) {
      const [r, g, b, a] = colorsGrid[y][x];
      for (let sy = 0; sy < scale; sy++) {
        for (let sx = 0; sx < scale; sx++) {
          const px = x * scale + sx;
          const py = y * scale + sy;
          const idx = (py * w + px) * 4;
          data[idx] = r;
          data[idx + 1] = g;
          data[idx + 2] = b;
          data[idx + 3] = a;
        }
      }
    }
  }
  return { width: w, height: h, data };
}
