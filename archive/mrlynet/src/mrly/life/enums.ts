export const Fate = {
  LIFE: "life",
  DEAD: "dead",
  LOOP: "loop",
  TIME: "time",
} as const;
export type Fate = typeof Fate[keyof typeof Fate];

export const Boundary = {
  CONSTANT: "constant",
  WRAP: "wrap",
} as const;
export type Boundary = typeof Boundary[keyof typeof Boundary];
