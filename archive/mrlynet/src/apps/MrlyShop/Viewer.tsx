import { useCallback } from "react";
import { ListBox, GridBox } from "../../components/System";
import { Controls } from "../../components/Controls";
import { ScreenshotButton } from "../../components/ScreenshotButton";
import { saveUrlPng } from "../../lib/browser/screenshot";
import { getTileUrl } from "./image";
import { Tile } from "./Tile";

const TILE_INDICES = [1, 3, 5, 7, 9];

interface ViewerProps {
  handle: string;
  tileIndex: number;
  onTileIndexChange: (index: number) => void;
}

export function Viewer({ handle, tileIndex, onTileIndexChange }: ViewerProps) {
  const current = TILE_INDICES.indexOf(tileIndex);
  const url = getTileUrl(handle, tileIndex);

  const goPrev = useCallback(() => {
    const prev = (current - 1 + TILE_INDICES.length) % TILE_INDICES.length;
    onTileIndexChange(TILE_INDICES[prev]);
  }, [current, onTileIndexChange]);

  const goNext = useCallback(() => {
    const next = (current + 1) % TILE_INDICES.length;
    onTileIndexChange(TILE_INDICES[next]);
  }, [current, onTileIndexChange]);

  const handleScreenshot = useCallback(
    (size: number) => {
      saveUrlPng(url, size);
    },
    [url]
  );

  return (
    <ListBox>
      <div className="carousel">
        {TILE_INDICES.map((idx) => (
          <Tile key={idx} handle={handle} tileIndex={idx} className={idx === tileIndex ? "visible" : ""} />
        ))}
      </div>
      <Controls current={current + 1} total={TILE_INDICES.length} onPrev={goPrev} onNext={goNext} />
      <GridBox cols={2}>
        <ScreenshotButton onSave={handleScreenshot} />
      </GridBox>
    </ListBox>
  );
}
