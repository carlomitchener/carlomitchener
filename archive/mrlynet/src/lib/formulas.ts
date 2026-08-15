import * as mj from "../mrly";
import type { MrlyDimension } from "../mrly";

export const gridSquares = mj.formulas.gridSquares;
export const gridCubes = mj.formulas.gridCubes;
export const gridTriangles = mj.formulas.gridTriangles;
export const carpetFillSquares = mj.formulas.carpetFillSquares;
export const carpetFillCubes = mj.formulas.carpetFillCubes;
export const carpetFillTriangles = mj.formulas.carpetFillTriangles;
export const netFillSquares = mj.formulas.netFillSquares;
export const netFillCubes = mj.formulas.netFillCubes;
export const netFillTriangles = mj.formulas.netFillTriangles;
export const treeFillSquares = mj.formulas.treeFillSquares;
export const treeFillCubes = mj.formulas.treeFillCubes;
export const treeFillTriangles = mj.formulas.treeFillTriangles;
export const voidFillSquares = mj.formulas.voidFillSquares;
export const voidFillCubes = mj.formulas.voidFillCubes;
export const voidFillTriangles = mj.formulas.voidFillTriangles;

export const getFractalStats = (design: string, n: number, l: number, dim: MrlyDimension) => {
  let grid = 0;
  let fill = 0;
  if (dim === 2) {
    grid = gridSquares(n, l);
    switch (design) {
      case "carpet":
        fill = carpetFillSquares(n, l);
        break;
      case "net":
        fill = netFillSquares(n, l);
        break;
      case "htree":
        fill = treeFillSquares(n, l);
        break;
      case "vtree":
        fill = treeFillSquares(n, l);
        break;
      case "void":
        fill = voidFillSquares(n, l);
        break;
      default:
        fill = 0;
        break;
    }
  } else if (dim === 3) {
    grid = gridCubes(n, l);
    switch (design) {
      case "carpet":
        fill = carpetFillCubes(n, l);
        break;
      case "net":
        fill = netFillCubes(n, l);
        break;
      case "tree":
        fill = treeFillCubes(n, l);
        break;
      case "void":
        fill = voidFillCubes(n, l);
        break;
      default:
        fill = 0;
        break;
    }
  } else {
    grid = gridTriangles(n, l);
    switch (design) {
      case "carpet":
        fill = carpetFillTriangles(n, l);
        break;
      case "net":
        fill = netFillTriangles(n, l);
        break;
      case "tree":
        fill = treeFillTriangles(n, l);
        break;
      case "void":
        fill = voidFillTriangles(n, l);
        break;
      default:
        fill = 0;
        break;
    }
  }
  return { grid, fill, void: grid - fill };
};

export const formatCount = (n: number): string => n.toLocaleString();
