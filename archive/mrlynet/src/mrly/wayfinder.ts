import type { Viewport } from "./mandelbrot";

// TYPES

export type IterateFn = (x: number, y: number, maxIter: number) => number;

export interface Wayfinder {
  pick(viewport: Viewport): { x: number; y: number };
}

// CONFIG

const SAMPLES = 200;
const PROBE_ITER = 150;

// CORE

export function createWayfinder(iterate: IterateFn): Wayfinder {
  return {
    pick(viewport) {
      const { xMin, xMax, yMin, yMax } = viewport;
      let bestScore = -1;
      let bestX = (xMin + xMax) / 2;
      let bestY = (yMin + yMax) / 2;
      for (let i = 0; i < SAMPLES; i++) {
        const x = xMin + Math.random() * (xMax - xMin);
        const y = yMin + Math.random() * (yMax - yMin);
        const iter = iterate(x, y, PROBE_ITER);
        const score = iter < PROBE_ITER ? iter : 0;
        if (score > bestScore) {
          bestScore = score;
          bestX = x;
          bestY = y;
        }
      }
      return { x: bestX, y: bestY };
    },
  };
}

// MANDELBROT

export function mandelbrotWayfinder(): Wayfinder {
  return createWayfinder((cr, ci, maxIter) => {
    let zr = 0,
      zi = 0,
      iter = 0;
    while (zr * zr + zi * zi <= 4 && iter < maxIter) {
      const tmp = zr * zr - zi * zi + cr;
      zi = 2 * zr * zi + ci;
      zr = tmp;
      iter++;
    }
    return iter;
  });
}

// JULIA

export function juliaWayfinder(cr: number, ci: number): Wayfinder {
  return createWayfinder((zr, zi, maxIter) => {
    let r = zr,
      i = zi,
      iter = 0;
    while (r * r + i * i <= 4 && iter < maxIter) {
      const tmp = r * r - i * i + cr;
      i = 2 * r * i + ci;
      r = tmp;
      iter++;
    }
    return iter;
  });
}
