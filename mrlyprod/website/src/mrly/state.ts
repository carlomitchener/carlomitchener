function mulberry32(seed: number): () => number {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export class State {
  private _random: () => number;

  constructor() {
    this._random = Math.random;
  }

  seed(s?: number): void {
    if (s === undefined || s === null) {
      this._random = Math.random;
    } else {
      this._random = mulberry32(s);
    }
  }

  random(): number {
    return this._random();
  }

  randint(low: number, high: number): number {
    return low + Math.floor(this._random() * (high - low));
  }

  choice<T>(arr: T[]): T {
    return arr[Math.floor(this._random() * arr.length)];
  }

  sample<T>(arr: T[], n: number): T[] {
    const copy = arr.slice();
    const result: T[] = [];
    for (let i = 0; i < n && copy.length > 0; i++) {
      const idx = Math.floor(this._random() * copy.length);
      result.push(copy.splice(idx, 1)[0]);
    }
    return result;
  }

  shuffle<T>(arr: T[]): T[] {
    const copy = arr.slice();
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(this._random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }

  bool(): boolean {
    return this._random() < 0.5;
  }
}

export const state = new State();

export function seed(s?: number): void {
  state.seed(s);
}
