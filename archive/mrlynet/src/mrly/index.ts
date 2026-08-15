// MODULES

export * as binary from "./binary";
export * as formulas from "./formulas";
export * as hex from "./six";
export * as life from "./life";

// CONFIG

export {
  MRLY_DESIGNS,
  MRLY_DESIGNS_3D,
  MRLY_NUMBERS,
  MAX_UNITS_OPTIONS,
  EXPORT_SIZE,
  calcFractalUnits,
  calcSquares,
  calcCubes,
  calcTriangles,
  getMaxLevel,
  getMaxLevel2D,
  getMaxLevel3D,
  getAllowedLevels,
  getMaxUnitsOptions,
} from "./config";
export type { MrlyDesign, MrlyDesign3D, MrlyNumber, MrlyDimension } from "./config";

// EXTRAS

export { Color, gradient, mix } from "./colors";
export type { RGBA } from "./colors";
export { seed } from "./state";
export { Mode } from "./enums";
export { MrlyError } from "./errors";

// MANDELBROT

export { DEFAULT_VIEWPORT as MANDELBROT_VIEWPORT, fitViewport, autoMaxIter, MANDELBROT_FRAG } from "./mandelbrot";
export type { Viewport } from "./mandelbrot";

// JULIA

export { DEFAULT_VIEWPORT as JULIA_VIEWPORT, PRESETS as JULIA_PRESETS, JULIA_FRAG } from "./julia";

// WAYFINDER

export { createWayfinder, mandelbrotWayfinder, juliaWayfinder } from "./wayfinder";
export type { Wayfinder, IterateFn } from "./wayfinder";

// WEBGL

export { VERTEX_SOURCE, createShader, createProgram, setupQuad } from "./webgl";

// DESIGNS

export { zeros2d, ones2d, noise2d, carpet2d, net2d, tree2d, void2d, random2d } from "./two/designs";
export { zeros3d, ones3d, noise3d, carpet3d, net3d, tree3d, void3d, random3d } from "./three/designs";

// MODELS

export { Cell2d } from "./two/models";
export type { Cell2dOptions, PaletteMap } from "./two/models";
export { Cell3d } from "./three/models";
export type { Cell3dOptions } from "./three/models";

// COLORS

export { alpha, black, white, gray, red, green, blue, cyan, magenta, yellow } from "./colors";

// GEOMETRY 2D

export { merge2d, magic2d, special2d, mosaic2d } from "./two/geometry";

// GEOMETRY 3D

export { merge3d, magic3d, special3d, mosaic3d } from "./three/geometry";

export { toSVG2d, toCanvas2d, toImageData2d } from "../lib/render/two";
export type { SVGOptions, CanvasOptions } from "../lib/render/two";
export { toOBJ } from "../lib/render/three";
