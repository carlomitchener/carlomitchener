export const MUSIC_GRID = [1, 1, 1, 1, 1, 1, 0, 1, 0, 1, 1, 1, 1, 1, 1, 1, 0, 1, 0, 1, 1, 1, 1, 1, 1];
export const BASE_NOTE = 43;
export const SCALES = {
  major: [0, 2, 4, 5, 7, 9, 11],
};

export function getNoteForGrid(gridIndex: number): number | null {
  let count = 0;
  for (let i = 0; i < gridIndex; i++) {
    if (MUSIC_GRID[i] === 1) count++;
  }
  if (MUSIC_GRID[gridIndex] === 0) return null;
  const scaleIntervals = SCALES.major;
  const octave = Math.floor(count / 7);
  const degree = count % 7;
  const interval = scaleIntervals[degree];
  return BASE_NOTE + octave * 12 + interval;
}

export function randomScaleNote(scale: number[], baseNote: number = BASE_NOTE): number {
  const degree = Math.floor(Math.random() * scale.length);
  const octave = Math.floor(Math.random() * 2);
  return baseNote + octave * 12 + scale[degree];
}
