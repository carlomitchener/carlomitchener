export const ROWS = 7;
export const COLS = 49;

type Stroke = [number, number][];

const STROKES: Record<string, Stroke[]> = {
  m: [
    [
      [4, 0],
      [3, 0],
      [2, 0],
      [1, 0],
      [0, 0],
    ],
    [
      [0, 1],
      [0, 2],
      [0, 3],
      [0, 4],
    ],
    [
      [1, 4],
      [2, 4],
      [3, 4],
      [4, 4],
    ],
    [
      [1, 2],
      [2, 2],
      [3, 2],
      [4, 2],
    ],
  ],
  r: [
    [
      [4, 0],
      [3, 0],
      [2, 0],
      [1, 0],
      [0, 0],
    ],
    [
      [0, 1],
      [0, 2],
      [0, 3],
      [0, 4],
    ],
  ],
  l: [
    [
      [0, 0],
      [1, 0],
      [2, 0],
      [3, 0],
      [4, 0],
    ],
    [
      [4, 1],
      [4, 2],
      [4, 3],
      [4, 4],
    ],
  ],
  y: [
    [
      [0, 0],
      [1, 0],
      [2, 0],
    ],
    [
      [2, 1],
      [2, 2],
      [2, 3],
    ],
    [
      [0, 4],
      [1, 4],
      [2, 4],
    ],
    [
      [3, 4],
      [4, 4],
      [4, 3],
      [4, 2],
      [4, 1],
      [4, 0],
    ],
  ],
  p: [
    [
      [4, 0],
      [3, 0],
      [2, 0],
      [1, 0],
      [0, 0],
    ],
    [
      [0, 1],
      [0, 2],
      [0, 3],
      [0, 4],
    ],
    [[1, 4]],
    [
      [2, 4],
      [2, 3],
      [2, 2],
      [2, 1],
    ],
  ],
  o: [
    [
      [4, 0],
      [3, 0],
      [2, 0],
      [1, 0],
      [0, 0],
    ],
    [
      [0, 1],
      [0, 2],
      [0, 3],
      [0, 4],
    ],
    [
      [1, 4],
      [2, 4],
      [3, 4],
      [4, 4],
    ],
    [
      [4, 3],
      [4, 2],
      [4, 1],
    ],
  ],
  d: [
    [
      [2, 3],
      [2, 2],
      [2, 1],
      [2, 0],
    ],
    [
      [3, 0],
      [4, 0],
    ],
    [
      [4, 1],
      [4, 2],
      [4, 3],
      [4, 4],
    ],
    [
      [3, 4],
      [2, 4],
      [1, 4],
      [0, 4],
    ],
  ],
};

const LETTER_SEQUENCE = ["m", "r", "l", "y", "p", "r", "o", "d"];

function generateWritingFrames(): number[][] {
  const frames: number[][] = [];
  const currentIndices: number[] = [];

  frames.push([]);

  LETTER_SEQUENCE.forEach((letter, i) => {
    const xOffset = 1 + i * 6;
    const letterStrokes = STROKES[letter];
    letterStrokes.forEach((stroke) => {
      stroke.forEach(([r, c]) => {
        const y = 1 + r;
        const x = xOffset + c;
        const index = y * COLS + x;
        currentIndices.push(index);
        frames.push([...currentIndices].sort((a, b) => a - b));
      });
    });
  });
  return frames;
}

function getMergePhase(frameIdx: number, totalFrames: number): [number, number] {
  const phaseLength = Math.floor(totalFrames / 4);
  if (frameIdx < phaseLength) return [1, frameIdx / phaseLength];
  if (frameIdx < phaseLength * 2) return [2, (frameIdx - phaseLength) / phaseLength];
  if (frameIdx < phaseLength * 3) return [3, (frameIdx - phaseLength * 2) / phaseLength];
  return [4, (frameIdx - phaseLength * 3) / (totalFrames - phaseLength * 3)];
}

function getLetterBits(letter: string): number[][] {
  const grid = Array(5)
    .fill(0)
    .map(() => Array(5).fill(0));
  STROKES[letter].forEach((stroke) => {
    stroke.forEach(([r, c]) => {
      grid[r][c] = 1;
    });
  });
  return grid;
}

function getLetterPosition(letterIdx: number, phase: number, progress: number): [number, number] {
  const startPositions = LETTER_SEQUENCE.map((_, i) => [1 + i * 6, 1]);
  const sx = startPositions[letterIdx][0];
  const sy = startPositions[letterIdx][1];
  const centerX = 22;
  const centerY = 1;
  const lerp = (start: number, end: number, p: number) => start + Math.trunc((end - start) * p);

  if (phase === 1) {
    if (letterIdx === 0) {
      const target = startPositions[1];
      return [lerp(sx, target[0], progress), lerp(sy, target[1], progress)];
    } else if (letterIdx === 7) {
      const target = startPositions[6];
      return [lerp(sx, target[0], progress), lerp(sy, target[1], progress)];
    }
    return [sx, sy];
  } else if (phase === 2) {
    if (letterIdx <= 1) {
      const groupStart = startPositions[1];
      const target = startPositions[2];
      return [lerp(groupStart[0], target[0], progress), lerp(groupStart[1], target[1], progress)];
    } else if (letterIdx >= 6) {
      const groupStart = startPositions[6];
      const target = startPositions[5];
      return [lerp(groupStart[0], target[0], progress), lerp(groupStart[1], target[1], progress)];
    }
    return [sx, sy];
  } else if (phase === 3) {
    if (letterIdx <= 2) {
      const groupStart = startPositions[2];
      const target = startPositions[3];
      return [lerp(groupStart[0], target[0], progress), lerp(groupStart[1], target[1], progress)];
    } else if (letterIdx >= 5) {
      const groupStart = startPositions[5];
      const target = startPositions[4];
      return [lerp(groupStart[0], target[0], progress), lerp(groupStart[1], target[1], progress)];
    }
    return [sx, sy];
  } else {
    let groupStart;
    if (letterIdx <= 3) groupStart = startPositions[3];
    else groupStart = startPositions[4];
    return [lerp(groupStart[0], centerX, progress), lerp(groupStart[1], centerY, progress)];
  }
}

function generateMergingFrames(): number[][] {
  const numFrames = Math.floor(COLS / 2);
  const frames: number[][] = [];
  let prevFrameJson = "";

  for (let i = 0; i <= numFrames; i++) {
    const [phase, progress] = getMergePhase(i, numFrames);
    const activeIndices = new Set<number>();

    LETTER_SEQUENCE.forEach((letter, letterIdx) => {
      const [cx, cy] = getLetterPosition(letterIdx, phase, progress);
      const bits = getLetterBits(letter);

      for (let r = 0; r < 5; r++) {
        for (let c = 0; c < 5; c++) {
          if (bits[r][c] === 1) {
            const y = cy + r;
            const x = cx + c;
            if (y >= 0 && y < ROWS && x >= 0 && x < COLS) {
              activeIndices.add(y * COLS + x);
            }
          }
        }
      }
    });

    const frameArray = Array.from(activeIndices).sort((a, b) => a - b);
    const json = JSON.stringify(frameArray);
    if (json !== prevFrameJson) {
      frames.push(frameArray);
      prevFrameJson = json;
    }
  }
  return frames;
}

export const FRAMES = {
  writing: generateWritingFrames(),
  merging: generateMergingFrames(),
};
