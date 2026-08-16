import { useState, useEffect, useRef, useCallback } from "react";
import { useMusic } from "./useMusic";

interface SongData {
  scale: string | null;
  progression: string | null;
  track: number[][];
}

interface UseSongPlayerReturn {
  playing: boolean;
  loading: boolean;
  error: boolean;
  currentNotes: Set<number>;
  songData: SongData | null;
  togglePlay: () => void;
}

const BEAT_MS = 250;

export function useSongPlayer(jsonUrl: string): UseSongPlayerReturn {
  const { playNote, stopNote } = useMusic();
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [songData, setSongData] = useState<SongData | null>(null);
  const [currentNotes, setCurrentNotes] = useState<Set<number>>(new Set());
  const beatRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const activeNotesRef = useRef<Set<number>>(new Set());
  // PLAYBACK
  const stopPlayback = useCallback(() => {
    if (timerRef.current !== null) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    beatRef.current = 0;
    setPlaying(false);
    activeNotesRef.current.forEach((midi) => stopNote(midi));
    activeNotesRef.current = new Set();
    setCurrentNotes(new Set());
  }, [stopNote]);
  // FETCH JSON
  useEffect(() => {
    stopPlayback();
    setSongData(null);
    setCurrentNotes(new Set());
    setError(false);
    if (!jsonUrl) return;
    setLoading(true);
    fetch(jsonUrl)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!data) return;
        if (Array.isArray(data)) {
          setSongData({ scale: null, progression: null, track: data });
        } else {
          setSongData(data as SongData);
        }
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [jsonUrl, stopPlayback]);
  const startPlayback = useCallback(() => {
    if (!songData?.track) return;
    const track = songData.track;
    beatRef.current = 0;
    setPlaying(true);
    const tick = () => {
      const beat = beatRef.current;
      if (beat >= track.length) {
        stopPlayback();
        return;
      }
      const notes = track[beat];
      const noteSet = new Set(notes);
      activeNotesRef.current = noteSet;
      setCurrentNotes(noteSet);
      for (const midi of notes) {
        playNote(midi, BEAT_MS / 1000);
      }
      beatRef.current = beat + 1;
    };
    tick();
    timerRef.current = setInterval(tick, BEAT_MS);
  }, [songData, playNote, stopPlayback]);
  // CLEANUP
  useEffect(() => {
    return () => {
      if (timerRef.current !== null) clearInterval(timerRef.current);
    };
  }, []);
  // TOGGLE
  const togglePlay = useCallback(() => {
    if (playing) {
      stopPlayback();
    } else {
      startPlayback();
    }
  }, [playing, stopPlayback, startPlayback]);
  return { playing, loading, error, currentNotes, songData, togglePlay };
}
