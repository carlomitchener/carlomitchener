import * as binary from "../binary";
import { state } from "../state";
import { Cell3d } from "./models";

// BUILDERS

function build3d(pattern: number[][][], level: number = 1): Cell3d {
  const cell = new Cell3d({ types: pattern });
  if (level > 1) cell.fractal(level);
  return cell;
}

// 3D

export function zeros3d(number: number, level: number = 1): Cell3d {
  return build3d(binary.zeros3d(number), level);
}

export function ones3d(number: number, level: number = 1): Cell3d {
  return build3d(binary.ones3d(number), level);
}

export function noise3d(number: number, level: number = 1, density: number = 0.5): Cell3d {
  return build3d(binary.noise3d(number, density), level);
}

export function carpet3d(number: number, level: number = 1): Cell3d {
  return build3d(binary.carpet3d(number), level);
}

export function net3d(number: number, level: number = 1): Cell3d {
  return build3d(binary.net3d(number), level);
}

export function tree3d(number: number, level: number = 1): Cell3d {
  return build3d(binary.tree3d(number), level);
}

export function void3d(number: number, level: number = 1): Cell3d {
  return build3d(binary.void3d(number), level);
}

// RANDOM

export function random3d(number: number, level: number = 1): Cell3d {
  const choices = [carpet3d, net3d, tree3d, void3d];
  return state.choice(choices)(number, level);
}
