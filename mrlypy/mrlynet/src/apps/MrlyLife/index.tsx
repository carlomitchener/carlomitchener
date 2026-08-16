import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Cell2d, life } from "../../mrly";
import { generate, render } from "../../lib/fractal";
import { mjColors as colors } from "../../lib/colors";
import { BorderBox, CardBox, GridBox, InfoBox, LinkBox, ListBox } from "../../components/System";
import { TilePicker, type TilePickerValue } from "../../components/TilePicker";

// CONSTANTS

const TILING_OPTIONS = [1, 2, 3, 4];
const PADDING_OPTIONS = [0, 2, 4, 8, 16, 32];
const ZOOM_OPTIONS = [0.5, 1, 2, 4, 8];
const SPEEDS = [1, 2, 4, 8, 16, 32, 60, 120, 240];

const SEQ_LABELS: Record<string, string> = Object.fromEntries(life.SEQUENCES.map((s) => [s.id, s.label]));
const SEQ_IDS = life.SEQUENCES.map((s) => s.id);

// HELPERS

function cloneTypes(types: number[][]): number[][] {
  return types.map((r) => r.slice());
}

function tileTypes(types: number[][], tiling: number): number[][] {
  if (tiling <= 1) return cloneTypes(types);
  const h = types.length;
  const w = types[0].length;
  const out: number[][] = [];
  for (let ty = 0; ty < tiling; ty++) {
    for (let y = 0; y < h; y++) {
      const row: number[] = [];
      for (let tx = 0; tx < tiling; tx++) {
        for (let x = 0; x < w; x++) row.push(types[y][x]);
      }
      out.push(row);
    }
  }
  return out;
}

function padTypes(types: number[][], pad: number): number[][] {
  if (pad <= 0) return cloneTypes(types);
  const h = types.length;
  const w = types[0].length;
  const out: number[][] = [];
  const padW = w + pad * 2;
  for (let i = 0; i < pad; i++) out.push(new Array(padW).fill(0));
  for (let y = 0; y < h; y++) {
    const row: number[] = new Array(padW).fill(0);
    for (let x = 0; x < w; x++) row[x + pad] = types[y][x];
    out.push(row);
  }
  for (let i = 0; i < pad; i++) out.push(new Array(padW).fill(0));
  return out;
}

function zeroTypes(size: number): number[][] {
  const out: number[][] = [];
  for (let y = 0; y < size; y++) out.push(new Array(size).fill(0));
  return out;
}

function noiseTypes(size: number, density: number): number[][] {
  const out: number[][] = [];
  for (let y = 0; y < size; y++) {
    const row: number[] = new Array(size);
    for (let x = 0; x < size; x++) row[x] = Math.random() < density ? 1 : 0;
    out.push(row);
  }
  return out;
}

function countMaskNeighbors(mask: number[][]): number {
  let n = 0;
  for (const row of mask) for (const v of row) if (v === 1) n++;
  return n;
}

// APP

export function MrlyLife() {
  // GRID / MASK
  const [gridPick, setGridPick] = useState<TilePickerValue>({ design: "carpet", number: 3, level: 2 });
  const [maskPick, setMaskPick] = useState<TilePickerValue>({ design: "carpet", number: 3, level: 1 });
  const [gridTiling, setGridTiling] = useState(1);
  const [maskTiling, setMaskTiling] = useState(1);
  const [padding, setPadding] = useState(0);
  const [zoomIndex, setZoomIndex] = useState(1);
  // RULE
  const [birthSeq, setBirthSeq] = useState<life.SequenceId>("odds");
  const [surviveSeq, setSurviveSeq] = useState<life.SequenceId>("evens");
  const [includeZeros, setIncludeZeros] = useState(false);
  const [includeOnes, setIncludeOnes] = useState(true);
  const [wrap, setWrap] = useState(false);
  // PLAYBACK
  const [speedIndex, setSpeedIndex] = useState(3);
  const [playing, setPlaying] = useState(false);
  // COLORS
  const [fillIndex, setFillIndex] = useState(0);
  const [voidIndex, setVoidIndex] = useState(1);
  // HISTORY
  const initialTypes = useMemo(() => {
    const base = generate(gridPick.design, gridPick.number, gridPick.level);
    return padTypes(tileTypes(base, gridTiling), padding);
  }, [gridPick, gridTiling, padding]);
  const maskTypes = useMemo(() => {
    const base = generate(maskPick.design, maskPick.number, maskPick.level);
    const tiled = tileTypes(base, maskTiling);
    return tiled.length % 2 === 0 ? padTypes(tiled, 1) : tiled;
  }, [maskPick, maskTiling]);
  const [history, setHistory] = useState<Cell2d[]>(() => [new Cell2d({ types: initialTypes })]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [fate, setFate] = useState<life.Fate | null>(null);
  const [loopPeriod, setLoopPeriod] = useState(0);
  useEffect(() => {
    setHistory([new Cell2d({ types: cloneTypes(initialTypes) })]);
    setHistoryIndex(0);
    setFate(null);
    setLoopPeriod(0);
    setPlaying(false);
  }, [initialTypes]);

  const maxNeighbors = useMemo(() => countMaskNeighbors(maskTypes), [maskTypes]);
  const birthCounts = useMemo(
    () => life.resolveCounts(birthSeq, maxNeighbors, includeZeros, includeOnes),
    [birthSeq, maxNeighbors, includeZeros, includeOnes],
  );
  const surviveCounts = useMemo(
    () => life.resolveCounts(surviveSeq, maxNeighbors, includeZeros, includeOnes),
    [surviveSeq, maxNeighbors, includeZeros, includeOnes],
  );
  const boundary: life.Boundary = wrap ? "wrap" : "constant";
  // CURRENT
  const safeIndex = Math.min(historyIndex, history.length - 1);
  const current = history[safeIndex] ?? history[0];
  const fill = colors[fillIndex];
  const voidc = colors[voidIndex];
  const zoom = ZOOM_OPTIONS[zoomIndex];
  // CANVAS
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const paintRef = useRef<{ active: boolean; value: number }>({ active: false, value: 1 });
  useEffect(() => {
    if (!canvasRef.current || !current) return;
    const types = current.types;
    const size = types.length;
    const scale = Math.max(1, Math.floor(512 / size));
    canvasRef.current.width = size * scale;
    canvasRef.current.height = size * scale;
    render(canvasRef.current, types, fill.color, voidc.color);
  }, [current, fill, voidc]);

  // NAV

  const advance = useCallback(() => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1);
      return;
    }
    if (fate) return;
    const prev = history[historyIndex];
    if (!prev) return;
    const next = life.step(prev, maskTypes, birthCounts, surviveCounts, boundary);
    if (life.gridsEqual(prev.types, next.types)) {
      let pop = 0;
      for (const row of next.types) for (const v of row) pop += v;
      setFate(pop === 0 ? life.Fate.DEAD : life.Fate.LIFE);
      setPlaying(false);
      return;
    }
    const nextKey = life.gridKey(next.types);
    for (let i = 0; i < history.length; i++) {
      if (life.gridKey(history[i].types) === nextKey) {
        setFate(life.Fate.LOOP);
        setLoopPeriod(history.length - i);
        setHistory([...history, next]);
        setHistoryIndex(history.length);
        setPlaying(false);
        return;
      }
    }
    setHistory([...history, next]);
    setHistoryIndex(historyIndex + 1);
  }, [history, historyIndex, maskTypes, birthCounts, surviveCounts, boundary, fate]);

  const goBack = () => setHistoryIndex((i) => Math.max(0, i - 1));
  const goStart = () => { setPlaying(false); setHistoryIndex(0); };
  const goEnd = () => setHistoryIndex(history.length - 1);

  useEffect(() => {
    if (!playing) return;
    const fps = SPEEDS[speedIndex];
    let raf = 0;
    let last = performance.now();
    const interval = 1000 / fps;
    const tick = (now: number) => {
      if (now - last >= interval) { last = now; advance(); }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, speedIndex, advance]);

  // EDIT

  const cellAt = useCallback((e: React.PointerEvent<HTMLCanvasElement>): [number, number] | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const size = current.types.length;
    const x = Math.floor(((e.clientX - rect.left) / rect.width) * size);
    const y = Math.floor(((e.clientY - rect.top) / rect.height) * size);
    if (x < 0 || y < 0 || x >= size || y >= size) return null;
    return [x, y];
  }, [current]);

  const editCell = useCallback((x: number, y: number, value: number) => {
    const target = history[historyIndex];
    if (!target || target.types[y][x] === value) return;
    const nextTypes = cloneTypes(target.types);
    nextTypes[y][x] = value;
    const truncated = history.slice(0, historyIndex + 1);
    truncated[historyIndex] = new Cell2d({ types: nextTypes });
    setHistory(truncated);
    setFate(null); setLoopPeriod(0);
  }, [history, historyIndex]);

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (playing) return;
    const cell = cellAt(e);
    if (!cell) return;
    const [x, y] = cell;
    const value = current.types[y][x] === 1 ? 0 : 1;
    paintRef.current = { active: true, value };
    editCell(x, y, value);
    canvasRef.current?.setPointerCapture(e.pointerId);
  };
  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (playing || !paintRef.current.active) return;
    const cell = cellAt(e);
    if (!cell) return;
    editCell(cell[0], cell[1], paintRef.current.value);
  };
  const endPaint = (e: React.PointerEvent<HTMLCanvasElement>) => {
    paintRef.current.active = false;
    canvasRef.current?.releasePointerCapture(e.pointerId);
  };

  // ACTIONS

  const handleReset = () => {
    setPlaying(false);
    setHistory([new Cell2d({ types: cloneTypes(initialTypes) })]);
    setHistoryIndex(0);
    setFate(null); setLoopPeriod(0);
  };
  const handleClear = () => {
    setPlaying(false);
    setHistory([new Cell2d({ types: zeroTypes(current.types.length) })]);
    setHistoryIndex(0);
    setFate(null); setLoopPeriod(0);
  };
  const handleRandomize = () => {
    setPlaying(false);
    setHistory([new Cell2d({ types: noiseTypes(current.types.length, 0.5) })]);
    setHistoryIndex(0);
    setFate(null); setLoopPeriod(0);
  };

  // STATS

  const fills = useMemo(() => {
    let n = 0;
    for (const row of current.types) for (const v of row) if (v === 1) n++;
    return n;
  }, [current]);
  const voids = current.types.length * current.types.length - fills;
  const entropy = useMemo(() => life.chaos(current.types).toFixed(2), [current]);

  // CYCLERS

  const cycleArray = <T,>(arr: readonly T[], idx: number, setIdx: (i: number) => void) => () => setIdx((idx + 1) % arr.length);
  const cycleVal = <T,>(arr: readonly T[], val: T, set: (v: T) => void) => () => {
    const i = arr.indexOf(val);
    set(arr[(i + 1) % arr.length]);
  };
  const cycleSeq = (current: life.SequenceId, set: (id: life.SequenceId) => void) => () => {
    const i = SEQ_IDS.indexOf(current);
    set(SEQ_IDS[(i + 1) % SEQ_IDS.length]);
  };

  const speedLabel = `${SPEEDS[speedIndex]} fps`;
  const atStart = historyIndex === 0;
  const atEnd = historyIndex === history.length - 1 && fate !== null;
  const stuckAtEnd = historyIndex === history.length - 1 && fate !== null;

  return (
    <ListBox>
      {}
      <BorderBox>
        <CardBox style={{ backgroundColor: voidc.color.toCSS(), overflow: "auto", maxHeight: "70vh" }}>
          <div style={{ width: `${zoom * 100}%`, aspectRatio: "1 / 1" }}>
            <canvas
              ref={canvasRef}
              className="fill"
              style={{ imageRendering: "pixelated", cursor: playing ? "default" : "crosshair", touchAction: "none", display: "block" }}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={endPaint}
              onPointerCancel={endPaint}
            />
          </div>
        </CardBox>
      </BorderBox>

      {}
      <BorderBox>
        <GridBox cols={3}>
          <InfoBox>gen: {historyIndex}</InfoBox>
          <InfoBox>fills: {fills}</InfoBox>
          <InfoBox>voids: {voids}</InfoBox>
          <InfoBox>H: {entropy}</InfoBox>
          <InfoBox>fate: {fate ?? "-"}</InfoBox>
          <InfoBox>period: {fate === life.Fate.LOOP ? loopPeriod : "-"}</InfoBox>
        </GridBox>
      </BorderBox>

      {}
      <BorderBox>
        <ListBox>
          <GridBox cols={5}>
            <LinkBox onClick={goStart} disabled={atStart}>nav: start</LinkBox>
            <LinkBox onClick={goBack} disabled={atStart}>nav: back</LinkBox>
            <LinkBox onClick={() => setPlaying((p) => !p)} active={playing} disabled={stuckAtEnd && !playing}>
              play: {playing ? "on" : "off"}
            </LinkBox>
            <LinkBox onClick={advance} disabled={atEnd}>nav: next</LinkBox>
            <LinkBox onClick={goEnd} disabled={historyIndex === history.length - 1}>nav: end</LinkBox>
          </GridBox>
          <GridBox cols={2}>
            <InfoBox>at: {historyIndex} / {history.length - 1}{fate ? ` ·${fate}${fate === "loop" ? ` p=${loopPeriod}` : ""}` : ""}</InfoBox>
            <LinkBox onClick={cycleArray(SPEEDS, speedIndex, setSpeedIndex)}>speed: {speedLabel}</LinkBox>
          </GridBox>
        </ListBox>
      </BorderBox>

      {}
      <BorderBox>
        <GridBox cols={2}>
          <TilePicker value={gridPick} onPick={setGridPick} label="grid" />
          <LinkBox onClick={cycleVal(TILING_OPTIONS, gridTiling, setGridTiling)}>grid tile: {gridTiling}x{gridTiling}</LinkBox>
        </GridBox>
      </BorderBox>

      {}
      <BorderBox>
        <GridBox cols={2}>
          <TilePicker value={maskPick} onPick={setMaskPick} label="mask" />
          <LinkBox onClick={cycleVal(TILING_OPTIONS, maskTiling, setMaskTiling)}>mask tile: {maskTiling}x{maskTiling}</LinkBox>
        </GridBox>
      </BorderBox>

      {}
      <BorderBox>
        <GridBox cols={2}>
          <LinkBox onClick={cycleVal(PADDING_OPTIONS, padding, setPadding)}>pad: {padding}</LinkBox>
          <LinkBox onClick={cycleArray(ZOOM_OPTIONS, zoomIndex, setZoomIndex)}>zoom: {zoom}x</LinkBox>
        </GridBox>
      </BorderBox>

      {}
      <BorderBox>
        <ListBox>
          <GridBox cols={2}>
            <LinkBox onClick={cycleSeq(birthSeq, setBirthSeq)}>birth: {SEQ_LABELS[birthSeq]}</LinkBox>
            <LinkBox onClick={cycleSeq(surviveSeq, setSurviveSeq)}>survive: {SEQ_LABELS[surviveSeq]}</LinkBox>
          </GridBox>
          <GridBox cols={3}>
            <LinkBox onClick={() => setIncludeZeros((v) => !v)} active={includeZeros}>zeros: {includeZeros ? "on" : "off"}</LinkBox>
            <LinkBox onClick={() => setIncludeOnes((v) => !v)} active={includeOnes}>ones: {includeOnes ? "on" : "off"}</LinkBox>
            <LinkBox onClick={() => setWrap((w) => !w)} active={wrap}>edge: {wrap ? "wrap" : "clip"}</LinkBox>
          </GridBox>
          <GridBox cols={2}>
            <InfoBox>B: [{birthCounts.slice(0, 8).join(",")}{birthCounts.length > 8 ? "…" : ""}]</InfoBox>
            <InfoBox>S: [{surviveCounts.slice(0, 8).join(",")}{surviveCounts.length > 8 ? "…" : ""}]</InfoBox>
          </GridBox>
        </ListBox>
      </BorderBox>

      {}
      <BorderBox>
        <GridBox cols={3}>
          <LinkBox onClick={handleReset}>grid: reset</LinkBox>
          <LinkBox onClick={handleClear}>grid: clear</LinkBox>
          <LinkBox onClick={handleRandomize}>grid: random</LinkBox>
        </GridBox>
      </BorderBox>

      {}
      <BorderBox>
        <GridBox cols={2}>
          <LinkBox onClick={() => setFillIndex((i) => (i + 1) % colors.length)}>fill: {fill.name}</LinkBox>
          <LinkBox onClick={() => setVoidIndex((i) => (i + 1) % colors.length)}>void: {voidc.name}</LinkBox>
        </GridBox>
      </BorderBox>
    </ListBox>
  );
}
