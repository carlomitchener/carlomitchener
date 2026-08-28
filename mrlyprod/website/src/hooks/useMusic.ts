import { useRef, useCallback } from "react";
import { initSynth, playSynth } from "../lib/audio/synth";
import { getItem } from "../lib/browser/storage";
import { SCALES, randomScaleNote } from "../lib/audio/music";

export const useMusic = () => {
  const activeHandles = useRef<Record<number, { stop: () => void }>>({});

  const initAudio = useCallback(async () => {
    await initSynth();
  }, []);

  const playNote = useCallback((midi: number, duration?: number, uniqueKey?: number) => {
    const sourceKey = uniqueKey ?? midi;
    const handle = playSynth(midi, duration);
    activeHandles.current[sourceKey] = handle;
  }, []);

  const stopNote = useCallback((uniqueKey: number) => {
    const handle = activeHandles.current[uniqueKey];
    if (handle) {
      handle.stop();
      delete activeHandles.current[uniqueKey];
    }
  }, []);

  const playRandomNote = useCallback(async () => {
    if (getItem("mrly_mute") === "true") return;
    const note = randomScaleNote(SCALES.major);
    playNote(note, 0.15, Math.random());
  }, [playNote]);

  return {
    initAudio,
    playNote,
    stopNote,
    playRandomNote,
  };
};
