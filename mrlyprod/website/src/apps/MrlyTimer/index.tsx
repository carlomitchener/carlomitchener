import { useState, useRef, useCallback, useEffect } from "react";
import { BorderBox, ListBox, CardBox, InfoBox, LinkBox, GridBox } from "../../components/System";
import { MrlyIcon } from "../../components/MrlyIcon";
import { useMusic } from "../../hooks/useMusic";

// HELPERS

function pad(n: number): string {
  return n.toString().padStart(2, "0");
}

function formatMs(ms: number): string {
  const totalSecs = Math.floor(ms / 1000);
  const mins = Math.floor(totalSecs / 60);
  const secs = totalSecs % 60;
  const centis = Math.floor((ms % 1000) / 10);
  return `${pad(mins)}:${pad(secs)}.${pad(centis)}`;
}

function formatDisplay(ms: number): string {
  const totalSecs = Math.floor(ms / 1000);
  const mins = Math.floor(totalSecs / 60);
  const secs = totalSecs % 60;
  return `${pad(mins)}:${pad(secs)}`;
}

// COMPONENT

type Mode = "stopwatch" | "countdown";

const PRESETS = [
  { label: "1m", ms: 60_000 },
  { label: "3m", ms: 180_000 },
  { label: "5m", ms: 300_000 },
  { label: "10m", ms: 600_000 },
];

export function MrlyTimer() {
  const { playRandomNote } = useMusic();
  const [mode, setMode] = useState<Mode>("stopwatch");
  const [elapsed, setElapsed] = useState(0);
  const [running, setRunning] = useState(false);
  const [laps, setLaps] = useState<number[]>([]);
  const [countdownTarget, setCountdownTarget] = useState(60_000);
  const startRef = useRef(0);
  const rafRef = useRef(0);
  const baseRef = useRef(0);

  const tick = useCallback(() => {
    setElapsed(baseRef.current + (Date.now() - startRef.current));
    rafRef.current = requestAnimationFrame(tick);
  }, []);

  const start = useCallback(() => {
    startRef.current = Date.now();
    setRunning(true);
    playRandomNote();
    rafRef.current = requestAnimationFrame(tick);
  }, [tick, playRandomNote]);

  const pause = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    baseRef.current = baseRef.current + (Date.now() - startRef.current);
    setRunning(false);
    playRandomNote();
  }, [playRandomNote]);

  const reset = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    setRunning(false);
    setElapsed(0);
    baseRef.current = 0;
    setLaps([]);
  }, []);

  const lap = useCallback(() => {
    playRandomNote();
    setLaps((prev) => [elapsed, ...prev]);
  }, [elapsed, playRandomNote]);

  // COUNTDOWN DONE
  const remaining = Math.max(0, countdownTarget - elapsed);
  useEffect(() => {
    if (mode === "countdown" && running && remaining === 0) {
      cancelAnimationFrame(rafRef.current);
      setRunning(false);
      playRandomNote();
    }
  }, [mode, running, remaining, playRandomNote]);

  useEffect(() => () => cancelAnimationFrame(rafRef.current), []);

  const displayMs = mode === "stopwatch" ? elapsed : remaining;
  const isFinished = mode === "countdown" && remaining === 0 && elapsed > 0;

  const switchMode = () => {
    reset();
    setMode((m) => (m === "stopwatch" ? "countdown" : "stopwatch"));
  };

  const selectPreset = (ms: number) => {
    reset();
    setCountdownTarget(ms);
  };

  return (
    <ListBox>
      <BorderBox>
        <ListBox>
          <LinkBox onClick={switchMode}>{mode}</LinkBox>
          <CardBox>
            <MrlyIcon text={formatDisplay(displayMs)} scramble={false} />
          </CardBox>
          <InfoBox>{formatMs(displayMs)}</InfoBox>
          {mode === "countdown" && !running && elapsed === 0 && (
            <GridBox cols={4}>
              {PRESETS.map((p) => (
                <LinkBox key={p.label} onClick={() => selectPreset(p.ms)} active={countdownTarget === p.ms}>
                  {p.label}
                </LinkBox>
              ))}
            </GridBox>
          )}
          {isFinished ? (
            <LinkBox onClick={reset}>reset</LinkBox>
          ) : (
            <GridBox cols={mode === "stopwatch" && running ? 3 : 2}>
              {running ? (
                <LinkBox onClick={pause}>pause</LinkBox>
              ) : (
                <LinkBox onClick={start}>{elapsed > 0 ? "resume" : "start"}</LinkBox>
              )}
              {mode === "stopwatch" && running && <LinkBox onClick={lap}>lap</LinkBox>}
              <LinkBox onClick={reset}>reset</LinkBox>
            </GridBox>
          )}
        </ListBox>
      </BorderBox>
      {laps.length > 0 && (
        <BorderBox>
          <ListBox>
            {laps.map((l, i) => (
              <InfoBox key={i}>
                lap {laps.length - i} - {formatMs(l)}
              </InfoBox>
            ))}
          </ListBox>
        </BorderBox>
      )}
    </ListBox>
  );
}
