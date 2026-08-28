import { randomColor, POOL } from "./colors";
import { FRAMES, ROWS, COLS } from "./frames";

interface SequenceStep {
  type: "writing" | "merging" | "hold";
  range?: [number, number];
  step?: number;
  frame?: { type: "writing" | "merging"; index: number };
  duration?: number;
}

interface AnimationConfig {
  fps: number;
  rows: number;
  cols: number;
  bgColor: "black" | "white";
  color: string | null;
  sequence: SequenceStep[];
}

export const CONFIG: AnimationConfig = {
  fps: 25,
  rows: ROWS,
  cols: COLS,
  bgColor: "black",
  color: null,
  sequence: [
    { type: "writing", range: [0, FRAMES.writing.length - 1], step: 1 },
    { type: "hold", frame: { type: "writing", index: FRAMES.writing.length - 1 }, duration: 25 },
    { type: "merging", range: [0, FRAMES.merging.length - 1], step: 1 },
    { type: "hold", frame: { type: "merging", index: FRAMES.merging.length - 1 }, duration: 25 },
    { type: "merging", range: [FRAMES.merging.length - 1, 0], step: -1 },
    { type: "hold", frame: { type: "merging", index: 0 }, duration: 25 },
    { type: "writing", range: [FRAMES.writing.length - 1, 0], step: -1 },
    { type: "hold", frame: { type: "writing", index: 0 }, duration: 25 },
  ],
};

export class AnimationController {
  private container: HTMLElement;
  private config: AnimationConfig;
  private cells: HTMLElement[] = [];
  private cellColors: (string | null)[] = [];
  private cellActive: boolean[] = [];
  private isPlaying: boolean = false;
  private sequenceIndex: number = 0;
  private currentSequenceStep: number = 0;
  private holdCounter: number = 0;
  private lastFrameTime: number = 0;
  private rafId: number | null = null;
  private observer: IntersectionObserver | null = null;

  constructor(container: HTMLElement, config: Partial<AnimationConfig> = {}) {
    this.container = container;
    const pickColor = Math.floor(Math.random() * (POOL.length + 1)) === POOL.length ? null : randomColor();
    this.config = { ...CONFIG, color: pickColor, ...config };
    this.init();
    this.observeVisibility();
  }

  private observeVisibility() {
    this.observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            this.play();
          } else {
            this.pause();
          }
        });
      },
      { threshold: 0.1 }
    );
    this.observer.observe(this.container);
  }

  private init() {
    this.container.innerHTML = "";
    this.container.style.display = "grid";
    this.container.style.gridTemplateColumns = `repeat(${this.config.cols}, 1fr)`;
    this.container.style.width = "100%";
    this.container.style.gap = "0";
    this.container.style.margin = "0";
    this.container.style.padding = "0";
    this.container.style.backgroundColor = this.config.bgColor === "white" ? "#fff" : "#000";
    const count = this.config.rows * this.config.cols;
    for (let i = 0; i < count; i++) {
      const cell = document.createElement("div");
      cell.style.aspectRatio = "1 / 1";
      cell.style.backgroundColor = this.config.bgColor === "white" ? "#fff" : "#000";
      this.container.appendChild(cell);
      this.cells.push(cell);
      this.cellColors.push(null);
      this.cellActive.push(false);
    }
  }

  private getFrameData(type: "writing" | "merging", index: number): number[] {
    return FRAMES[type][index];
  }

  private renderFrame(activeIndices: number[]) {
    if (!activeIndices) return;
    const bg = this.config.bgColor === "white" ? "#fff" : "#000";
    const activeSet = new Set(activeIndices);
    for (let i = 0; i < this.cells.length; i++) {
      const isActive = activeSet.has(i);
      const wasActive = this.cellActive[i];
      let targetColor: string | null;
      if (isActive) {
        if (!wasActive) this.cellColors[i] = this.config.color ?? randomColor();
        targetColor = this.cellColors[i];
      } else {
        this.cellColors[i] = null;
        targetColor = bg;
      }
      const displayedColor = targetColor || "";
      if (this.cells[i].style.backgroundColor !== displayedColor) {
        this.cells[i].style.backgroundColor = displayedColor;
      }
      this.cellActive[i] = isActive;
    }
  }

  public play() {
    if (this.isPlaying) return;
    this.isPlaying = true;
    this.lastFrameTime = 0;
    this.animate(0);
  }

  public pause() {
    this.isPlaying = false;
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  private animate(timestamp: number) {
    if (!this.isPlaying) return;
    const interval = 1000 / this.config.fps;
    if (!this.lastFrameTime || timestamp - this.lastFrameTime >= interval) {
      this.lastFrameTime = timestamp;
      this.step();
    }
    this.rafId = requestAnimationFrame((t) => this.animate(t));
  }

  private step() {
    const seq = this.config.sequence[this.sequenceIndex];
    if (seq.type === "hold") {
      if (seq.frame) {
        const frameData = this.getFrameData(seq.frame.type, seq.frame.index);
        this.renderFrame(frameData);
      }
      this.holdCounter++;
      if (seq.duration && this.holdCounter >= seq.duration) {
        this.holdCounter = 0;
        this.nextSequence();
      }
    } else {
      if (!seq.range) {
        this.nextSequence();
        return;
      }
      const idxStart = seq.range[0];
      const idxEnd = seq.range[1];
      const step = seq.step || 1;
      let frameIdx: number;
      if (step > 0) {
        frameIdx = idxStart + this.currentSequenceStep;
        if (frameIdx > idxEnd) {
          this.nextSequence();
          return;
        }
      } else {
        frameIdx = idxStart - this.currentSequenceStep;
        if (frameIdx < idxEnd) {
          this.nextSequence();
          return;
        }
      }
      if (seq.type === "writing" || seq.type === "merging") {
        const frameData = this.getFrameData(seq.type, frameIdx);
        this.renderFrame(frameData);
      }
      this.currentSequenceStep++;
    }
  }

  private nextSequence() {
    this.sequenceIndex++;
    this.currentSequenceStep = 0;
    if (this.sequenceIndex >= this.config.sequence.length) {
      this.sequenceIndex = 0;
    }
  }

  public destroy() {
    this.pause();
    if (this.observer) this.observer.disconnect();
    this.container.innerHTML = "";
  }
}
