import * as binary from "../binary";
import { state } from "../state";
import { Cell2d } from "./models";

// BUILDERS

function build2d(pattern: number[][], level: number = 1, rotation: number = 0): Cell2d {
  const cell = new Cell2d({ types: pattern });
  if (level > 1) cell.fractal(level);
  if (rotation !== 0) cell.rotate(rotation);
  return cell;
}

// 2D

export function zeros2d(number: number, level: number = 1, rotation: number = 0): Cell2d {
  return build2d(binary.zeros2d(number), level, rotation);
}

export function ones2d(number: number, level: number = 1, rotation: number = 0): Cell2d {
  return build2d(binary.ones2d(number), level, rotation);
}

export function noise2d(number: number, level: number = 1, density: number = 0.5, rotation: number = 0): Cell2d {
  return build2d(binary.noise2d(number, density), level, rotation);
}

export function carpet2d(number: number, level: number = 1, rotation: number = 0): Cell2d {
  return build2d(binary.carpet2d(number), level, rotation);
}

export function net2d(number: number, level: number = 1, rotation: number = 0): Cell2d {
  return build2d(binary.net2d(number), level, rotation);
}

export function tree2d(number: number, level: number = 1, rotation: number = 0): Cell2d {
  return build2d(binary.tree2d(number), level, rotation);
}

export function void2d(number: number, level: number = 1, rotation: number = 0): Cell2d {
  return build2d(binary.void2d(number), level, rotation);
}

// RANDOM

export function random2d(number: number, level: number = 1, rotation: number = 0): Cell2d {
  const choices = [carpet2d, net2d, tree2d, void2d];
  return state.choice(choices)(number, level, rotation);
}
