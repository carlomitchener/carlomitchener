const FADE_DURATION = 1 / 64;
const DEFAULT_VOLUME = 0.3;

let ctx: AudioContext | null = null;
let compressor: DynamicsCompressorNode | null = null;

function midiToFreq(midi: number): number {
  return 440 * 2 ** ((midi - 69) / 12);
}

function ensureContext(): AudioContext {
  if (!ctx) {
    ctx = new AudioContext();

    compressor = ctx.createDynamicsCompressor();
    compressor.threshold.value = -6;
    compressor.knee.value = 12;
    compressor.ratio.value = 12;
    compressor.attack.value = 0.003;
    compressor.release.value = 0.1;
    compressor.connect(ctx.destination);
  }
  return ctx;
}

export async function initSynth(): Promise<void> {
  const c = ensureContext();
  if (c.state === "suspended") await c.resume();
}

export function playSynth(midi: number, duration?: number): { stop: () => void } {
  const c = ensureContext();
  const now = c.currentTime;
  // OSCILLATOR
  const osc = c.createOscillator();
  osc.type = "sine";
  osc.frequency.value = midiToFreq(midi);
  // GAIN ENVELOPE
  const gain = c.createGain();
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(DEFAULT_VOLUME, now + FADE_DURATION);
  if (duration !== undefined) {
    gain.gain.setValueAtTime(DEFAULT_VOLUME, now + duration - FADE_DURATION);
    gain.gain.linearRampToValueAtTime(0, now + duration);
  }
  // CONNECT AND START
  osc.connect(gain);
  gain.connect(compressor!);
  osc.start(now);
  if (duration !== undefined) osc.stop(now + duration);
  let stopped = false;
  const stop = () => {
    if (stopped) return;
    stopped = true;
    try {
      const t = c.currentTime;
      gain.gain.cancelScheduledValues(t);
      gain.gain.setValueAtTime(gain.gain.value, t);
      gain.gain.linearRampToValueAtTime(0, t + FADE_DURATION);
      osc.stop(t + FADE_DURATION);
    } catch {

    }
  };
  osc.onended = () => {
    try {
      osc.disconnect();
      gain.disconnect();
    } catch {

    }
  };
  return { stop };
}

export function disposeSynth(): void {
  if (ctx) {
    ctx.close().catch(() => {});
    ctx = null;
    compressor = null;
  }
}
