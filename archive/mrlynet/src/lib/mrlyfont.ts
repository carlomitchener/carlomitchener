import data from "./mrlyfont.json";

export interface MrlyChar {
  name: string;
  w: number;
  h: number;
  rows: string[];
}

export const mrlyFont: Record<string, MrlyChar> = data;
