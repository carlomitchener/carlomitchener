import { generate } from "../../lib/fractal";

// TYPES

export interface Mask {
  types: number[][];
  width: number;
  height: number;
}

// BUILD

export function buildMask(
  design: string,
  number: number,
  level: number,
  padding: number,
  subpixel: number,
  invert: boolean,
): Mask {
  const base = generate(design, number, level);
  const baseSize = base.length;
  const up = Math.max(1, subpixel);
  const inner = baseSize * up;
  const total = inner + padding * 2;
  const types: number[][] = [];
  for (let y = 0; y < total; y++) {
    const row: number[] = new Array(total);
    for (let x = 0; x < total; x++) {
      const bx = x - padding;
      const by = y - padding;
      if (bx < 0 || by < 0 || bx >= inner || by >= inner) {
        row[x] = 0;
      } else {
        const v = base[Math.floor(by / up)][Math.floor(bx / up)];
        row[x] = invert ? 1 - v : v;
      }
    }
    types.push(row);
  }
  return { types, width: total, height: total };
}

// FLAT

export function flatMask(mask: Mask): Uint8Array {
  const out = new Uint8Array(mask.width * mask.height);
  for (let y = 0; y < mask.height; y++) {
    const row = mask.types[y];
    for (let x = 0; x < mask.width; x++) out[y * mask.width + x] = row[x] ? 255 : 0;
  }
  return out;
}

// UPLOAD

export function uploadMaskTexture(gl: WebGL2RenderingContext, mask: Mask): WebGLTexture {
  const tex = gl.createTexture()!;
  gl.bindTexture(gl.TEXTURE_2D, tex);
  const data = flatMask(mask);
  gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.R8, mask.width, mask.height, 0, gl.RED, gl.UNSIGNED_BYTE, data);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  return tex;
}
