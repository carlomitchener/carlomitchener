export function chaos(grid: number[][]): number {
  let ones = 0;
  let total = 0;
  for (const row of grid) {
    for (const v of row) {
      total++;
      if (v) ones++;
    }
  }
  if (total === 0) return 0;
  const p = ones / total;
  if (p === 0 || p === 1) return 0;
  return -(p * Math.log2(p) + (1 - p) * Math.log2(1 - p));
}

export function temporalChaos(grids: number[][][]): number {
  if (grids.length < 2) return 0;
  let total = 0;
  for (let i = 1; i < grids.length; i++) {
    const a = grids[i - 1];
    const b = grids[i];
    let diff = 0;
    let cells = 0;
    for (let y = 0; y < a.length; y++) {
      for (let x = 0; x < a[0].length; x++) {
        if (a[y][x] !== b[y][x]) diff++;
        cells++;
      }
    }
    total += cells ? diff / cells : 0;
  }
  return total / (grids.length - 1);
}
