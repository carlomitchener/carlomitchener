import type { Boundary } from "./enums";

export interface LifeConfig {
  birth: number[];
  survive: number[];
  boundary: Boundary;
  maxGenerations: number;
}

export const DEFAULT_CONFIG: LifeConfig = {
  birth: [3],
  survive: [2, 3],
  boundary: "constant",
  maxGenerations: 500,
};
