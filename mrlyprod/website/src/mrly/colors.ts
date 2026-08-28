import { MrlyError } from "./errors";
import { state } from "./state";

export type RGBA = [number, number, number, number];

export class Color {
  readonly r: number;
  readonly g: number;
  readonly b: number;
  readonly a: number;

  constructor(r: number = 0, g: number = 0, b: number = 0, a: number = 255) {
    this.r = r;
    this.g = g;
    this.b = b;
    this.a = a;
  }

  toString(): string {
    return this.toCSS();
  }

  equals(other: Color): boolean {
    return this.r === other.r && this.g === other.g && this.b === other.b && this.a === other.a;
  }

  toCSS(): string {
    if (this.a === 255) return `rgb(${this.r},${this.g},${this.b})`;
    return `rgba(${this.r},${this.g},${this.b},${this.a})`;
  }

  toDict(): RGBA {
    return [this.r, this.g, this.b, this.a];
  }

  static fromDict(data: RGBA): Color {
    return new Color(data[0], data[1], data[2], data[3]);
  }

  static rgbaToHex(r: number, g: number, b: number, a: number): string {
    const hex = (v: number) => v.toString(16).padStart(2, "0");
    if (a === 255) return `#${hex(r)}${hex(g)}${hex(b)}`;
    return `#${hex(r)}${hex(g)}${hex(b)}${hex(a)}`;
  }

  toHex(): string {
    return Color.rgbaToHex(this.r, this.g, this.b, this.a);
  }

  static fromHex(hexCode: string, alpha: number = 255): Color {
    const hex = hexCode.replace("#", "");
    if (hex.length === 8) {
      return new Color(
        parseInt(hex.slice(0, 2), 16),
        parseInt(hex.slice(2, 4), 16),
        parseInt(hex.slice(4, 6), 16),
        parseInt(hex.slice(6, 8), 16)
      );
    } else if (hex.length === 6) {
      return new Color(
        parseInt(hex.slice(0, 2), 16),
        parseInt(hex.slice(2, 4), 16),
        parseInt(hex.slice(4, 6), 16),
        alpha
      );
    }
    throw new MrlyError("Hex code must be in format #RRGGBB or #RRGGBBAA");
  }

  toRGB(): [number, number, number] {
    return [this.r, this.g, this.b];
  }

  static fromRGB(r: number, g: number, b: number, alpha: number = 255): Color {
    return new Color(r, g, b, alpha);
  }

  toRGBA(): RGBA {
    return [this.r, this.g, this.b, this.a];
  }

  static fromRGBA(r: number, g: number, b: number, a: number): Color {
    return new Color(r, g, b, a);
  }

  alpha(level: number): Color {
    if (level < 0 || level > 255) throw new MrlyError(`Level must be between 0 and 255, got ${level}`);
    return new Color(this.r, this.g, this.b, level);
  }

  invert(): Color {
    return new Color(255 - this.r, 255 - this.g, 255 - this.b, this.a);
  }

  lightness(level: number): Color {
    if (level < 0 || level > 100) throw new MrlyError(`Level must be between 0 and 100, got ${level}`);
    let r: number, g: number, b: number;
    if (level === 50) {
      r = this.r;
      g = this.g;
      b = this.b;
    } else if (level < 50) {
      const factor = level / 50;
      r = Math.floor(this.r * factor);
      g = Math.floor(this.g * factor);
      b = Math.floor(this.b * factor);
    } else {
      const factor = (level - 50) / 50;
      r = Math.floor(this.r + (255 - this.r) * factor);
      g = Math.floor(this.g + (255 - this.g) * factor);
      b = Math.floor(this.b + (255 - this.b) * factor);
    }
    return new Color(r, g, b, this.a);
  }

  static random(withAlpha: boolean = false): Color {
    return new Color(
      state.randint(0, 256),
      state.randint(0, 256),
      state.randint(0, 256),
      withAlpha ? state.randint(0, 256) : 255
    );
  }
}

export function mix(color1: Color, color2: Color, ratio: number = 0.5): Color {
  if (ratio < 0 || ratio > 1) throw new MrlyError(`Ratio must be between 0.0 and 1.0, got ${ratio}`);
  const r = Math.floor(color1.r + (color2.r - color1.r) * ratio);
  const g = Math.floor(color1.g + (color2.g - color1.g) * ratio);
  const b = Math.floor(color1.b + (color2.b - color1.b) * ratio);
  const a = Math.floor(color1.a + (color2.a - color1.a) * ratio);
  return new Color(r, g, b, a);
}

export function gradient(colors: Color[], steps: number): Color[] {
  if (!colors.length) throw new MrlyError("Cannot create a gradient from an empty list of colors.");
  if (steps < 1) throw new MrlyError("Steps must be at least 1.");
  if (steps === 1) return [colors[0]];
  if (colors.length === 1) return Array.from({ length: steps }, () => colors[0]);
  const result: Color[] = [];
  const segments = colors.length - 1;
  for (let i = 0; i < steps; i++) {
    const pos = i / (steps - 1);
    let seg = Math.floor(pos * segments);
    if (seg >= segments) seg = segments - 1;
    const ratio = pos * segments - seg;
    result.push(mix(colors[seg], colors[seg + 1], ratio));
  }
  return result;
}

export const alpha = new Color(0, 0, 0, 0);
export const black = new Color(0, 0, 0);
export const white = new Color(255, 255, 255);
export const gray = new Color(128, 128, 128);
export const red = new Color(255, 0, 0);
export const green = new Color(0, 255, 0);
export const blue = new Color(0, 0, 255);
export const cyan = new Color(0, 255, 255);
export const magenta = new Color(255, 0, 255);
export const yellow = new Color(255, 255, 0);
