import { useState, useEffect, useCallback } from "react";
import { useMusic } from "../../hooks/useMusic";
import { BorderBox, ListBox } from "../../components/System";
import { Keyboard } from "../../components/Keyboard";

export function MrlyPiano() {
  const { initAudio, playNote, stopNote } = useMusic();
  const [currentNotes, setCurrentNotes] = useState<Set<number>>(new Set());
  // INIT
  useEffect(() => {
    initAudio();
  }, [initAudio]);
  // PLAY
  const handleNoteStart = useCallback(
    (midi: number) => {
      playNote(midi);
      setCurrentNotes((prev) => new Set(prev).add(midi));
    },
    [playNote]
  );
  // STOP
  const handleNoteStop = useCallback(
    (midi: number) => {
      stopNote(midi);
      setCurrentNotes((prev) => {
        const next = new Set(prev);
        next.delete(midi);
        return next;
      });
    },
    [stopNote]
  );
  return (
    <ListBox>
      <BorderBox>
        <Keyboard currentNotes={currentNotes} onNoteStart={handleNoteStart} onNoteStop={handleNoteStop} />
      </BorderBox>
    </ListBox>
  );
}
