import { useState, useMemo } from "react";
import { MRLY_NUMBERS, getAllowedLevels, getMaxUnitsOptions } from "../mrly";
import { getFractalStats, formatCount } from "../lib/formulas";

// TYPES

interface UseDesignerConfig {
  designs: readonly string[];
  dimension: 2 | 3 | 6;
  defaultDesignIndex?: number;
  defaultNumberIndex?: number;
  defaultLevelIndex?: number;
  defaultMaxUnitsIndex?: number;
}

// HOOK

export function useDesigner(config: UseDesignerConfig) {
  const { designs, dimension } = config;
  const [designIndex, setDesignIndex] = useState(config.defaultDesignIndex ?? 0);
  const [numberIndex, setNumberIndex] = useState(config.defaultNumberIndex ?? 1);
  const [levelIndex, setLevelIndex] = useState(config.defaultLevelIndex ?? 0);
  const unitsOptions = getMaxUnitsOptions(dimension);
  const [maxUnitsIndex, setMaxUnitsIndex] = useState(config.defaultMaxUnitsIndex ?? 0);
  const maxUnits = unitsOptions[Math.min(maxUnitsIndex, unitsOptions.length - 1)].value;
  const number = MRLY_NUMBERS[numberIndex];
  const design = designs[designIndex];
  const allowedLevels = useMemo(() => getAllowedLevels(number, maxUnits, dimension), [number, maxUnits, dimension]);
  const level = allowedLevels[Math.min(levelIndex, allowedLevels.length - 1)] || 1;
  const stats = useMemo(() => getFractalStats(design, number, level, dimension), [design, number, level, dimension]);
  const cycleDesign = () => setDesignIndex((i) => (i + 1) % designs.length);
  const cycleNumber = () => setNumberIndex((i) => (i + 1) % MRLY_NUMBERS.length);
  const cycleLevel = () => setLevelIndex((i) => (i + 1) % allowedLevels.length);
  const cycleMaxUnits = () => {
    setMaxUnitsIndex((i) => (i + 1) % unitsOptions.length);
    setLevelIndex(0);
  };
  const clampedIndex = Math.min(maxUnitsIndex, unitsOptions.length - 1);
  return {
    designIndex,
    design,
    cycleDesign,
    numberIndex,
    number,
    cycleNumber,
    levelIndex,
    level,
    cycleLevel,
    maxUnitsIndex,
    maxUnits,
    cycleMaxUnits,
    maxUnitsLabel: unitsOptions[clampedIndex].label,
    allowedLevels,
    stats,
    gridCount: formatCount(stats.grid),
    fillCount: formatCount(stats.fill),
    voidCount: formatCount(stats.void),
  };
}
