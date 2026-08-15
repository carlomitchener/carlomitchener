import { GridBox, CardBox } from "./System";
import { MUSIC_GRID, getNoteForGrid } from "../lib/audio/music";

interface KeyboardProps {
  currentNotes?: Set<number>;
  onNoteStart?: (midi: number) => void;
  onNoteStop?: (midi: number) => void;
}

export function Keyboard({ currentNotes, onNoteStart, onNoteStop }: KeyboardProps) {
  return (
    <GridBox cols={5} style={{ userSelect: "none", WebkitUserSelect: "none", touchAction: "none" }}>
      {MUSIC_GRID.map((active, i) => {
        const midi = active ? getNoteForGrid(i) : null;
        const isPlaying = midi !== null && currentNotes?.has(midi);
        if (!active) return <div key={i} />;
        return (
          <CardBox
            key={i}
            active={isPlaying}
            onPointerDown={() => {
              if (midi !== null) onNoteStart?.(midi);
            }}
            onPointerUp={() => {
              if (midi !== null) onNoteStop?.(midi);
            }}
            onPointerLeave={() => {
              if (midi !== null && isPlaying) onNoteStop?.(midi);
            }}
            onPointerCancel={() => {
              if (midi !== null) onNoteStop?.(midi);
            }}
          />
        );
      })}
    </GridBox>
  );
}
