import React, { useState, useMemo } from "react";
import { generate } from "../../lib/fractal";
import { BorderBox, ListBox, LinkBox, GridBox, InfoBox, FormBox } from "../../components/System";
import { ScreenshotButton } from "../../components/ScreenshotButton";
import { MRLY_DESIGNS, MRLY_NUMBERS, getAllowedLevels } from "../../mrly";
import { saveCanvasPng } from "../../lib/browser/screenshot";
import { useTheme } from "../../contexts/ThemeContext";

// CONSTANTS

const MAX_CELLS = 2500;

export function MrlyText() {
  const [designIndex, setDesignIndex] = useState(0);
  const [numberIndex, setNumberIndex] = useState(1);
  const [levelIndex, setLevelIndex] = useState(0);
  const [fill, setFill] = useState("🍎");
  const [void_, setVoid_] = useState("🍏");
  const { mode, font } = useTheme();

  // GRID

  const design = MRLY_DESIGNS[designIndex];
  const number = MRLY_NUMBERS[numberIndex];
  const allowedLevels = useMemo(() => getAllowedLevels(number, MAX_CELLS, 2), [number]);
  const level = allowedLevels[Math.min(levelIndex, allowedLevels.length - 1)] || 1;
  const grid = useMemo(() => generate(design, number, level), [design, number, level]);
  const cols = grid[0]?.length || 1;

  // SCREENSHOT

  const handleDownloadPNG = (size: number) => {
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d")!;
    const bgColor = mode ? "#000000" : "#ffffff";
    const fgColor = mode ? "#ffffff" : "#000000";
    const n = grid.length;
    const cellSize = size / n;
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, size, size);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const fontFamily = font ? "MrlyFont" : "serif";
    ctx.font = `${Math.floor(cellSize * 0.85)}px ${fontFamily}`;
    ctx.fillStyle = fgColor;
    for (let y = 0; y < n; y++) {
      for (let x = 0; x < grid[y].length; x++) {
        const char = grid[y][x] === 1 ? fill : void_;
        ctx.fillText(char, x * cellSize + cellSize / 2, y * cellSize + cellSize / 2);
      }
    }
    saveCanvasPng(canvas, size);
  };

  // RENDER

  return (
    <ListBox>
      <BorderBox>
        <ListBox>
          <div
            className="text-grid"
            style={
              {
                "--matrix-cols": cols,
                "--matrix-rows": grid.length,
              } as React.CSSProperties
            }
          >
            {grid.flatMap((row, y) =>
              row.map((val, x) => (
                <div key={`${y}-${x}`} className="text-cell">
                  {val === 1 ? fill : void_}
                </div>
              ))
            )}
          </div>
          <GridBox cols={4}>
            <InfoBox>fill</InfoBox>
            <FormBox value={fill} onChange={setFill} />
            <InfoBox>void</InfoBox>
            <FormBox value={void_} onChange={setVoid_} />
          </GridBox>
          <GridBox cols={3}>
            <LinkBox onClick={() => setDesignIndex((i) => (i + 1) % MRLY_DESIGNS.length)}>{design}</LinkBox>
            <LinkBox onClick={() => setNumberIndex((i) => (i + 1) % MRLY_NUMBERS.length)}>{number}</LinkBox>
            <LinkBox onClick={() => setLevelIndex((i) => (i + 1) % allowedLevels.length)}>{level}</LinkBox>
          </GridBox>
          <GridBox cols={3}>
            <ScreenshotButton onSave={handleDownloadPNG} />
            <InfoBox>
              {cols} x {grid.length}
            </InfoBox>
          </GridBox>
        </ListBox>
      </BorderBox>
    </ListBox>
  );
}
