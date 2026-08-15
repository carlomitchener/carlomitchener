export const MRLY_DESIGNS = ["carpet", "net", "htree", "vtree", "void"] as const;
export type MrlyDesign = (typeof MRLY_DESIGNS)[number];

export const MRLY_DESIGNS_3D = ["carpet", "net", "tree", "void"] as const;
export type MrlyDesign3D = (typeof MRLY_DESIGNS_3D)[number];

export const MRLY_NUMBERS = [3, 5, 7, 9] as const;
export type MrlyNumber = (typeof MRLY_NUMBERS)[number];

export const MAX_UNITS_OPTIONS = [
  { label: "10K", value: 10000 },
  { label: "20K", value: 20000 },
  { label: "40K", value: 40000 },
  { label: "80K", value: 80000 },
  { label: "160K", value: 160000 },
  { label: "320K", value: 320000 },
  { label: "640K", value: 640000 },
] as const;

const MAX_UNITS_LIMIT: Record<MrlyDimension, number> = { 2: 320000, 3: 160000, 6: 10000 };

export const getMaxUnitsOptions = (dim: MrlyDimension) =>
  MAX_UNITS_OPTIONS.filter((o) => o.value <= MAX_UNITS_LIMIT[dim]);

export const EXPORT_SIZE = 1000;

export type MrlyDimension = 2 | 3 | 6;

export const calcFractalUnits = (n: number, level: number, dim: MrlyDimension): number => {
  if (dim === 6) return 6 * Math.pow(n, 2 * level);
  return Math.pow(n, dim * level);
};
export const calcSquares = (n: number, level: number): number => calcFractalUnits(n, level, 2);
export const calcCubes = (n: number, level: number): number => calcFractalUnits(n, level, 3);
export const calcTriangles = (n: number, level: number): number => calcFractalUnits(n, level, 6);

export const getMaxLevel = (n: number, maxUnits: number, dim: MrlyDimension = 2): number => {
  for (let level = 1; level <= 10; level++) {
    if (calcFractalUnits(n, level, dim) > maxUnits) return Math.max(1, level - 1);
  }
  return 10;
};

export const getMaxLevel2D = (n: number, maxSquares: number): number => getMaxLevel(n, maxSquares, 2);
export const getMaxLevel3D = (n: number, maxCubes: number): number => getMaxLevel(n, maxCubes, 3);

export const getAllowedLevels = (n: number, maxUnits: number, dim: MrlyDimension = 2): number[] => {
  const max = getMaxLevel(n, maxUnits, dim);
  return Array.from({ length: max }, (_, i) => i + 1);
};
