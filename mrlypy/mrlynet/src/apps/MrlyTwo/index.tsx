import { useState, useRef, useCallback, useMemo, useEffect } from "react";
import { generate, render, toSVG } from "../../lib/fractal";
import { mjColors as colors } from "../../lib/colors";
import { BorderBox, ListBox, LinkBox, GridBox, CardBox, InfoBox } from "../../components/System";
import { ScreenshotButton } from "../../components/ScreenshotButton";
import { MRLY_DESIGNS } from "../../mrly";
import { useDesigner } from "../../hooks/useDesigner";
import { saveCanvasPng, saveSvgString } from "../../lib/browser/screenshot";

export function MrlyTwo() {
  const d = useDesigner({ designs: MRLY_DESIGNS, dimension: 2 });
  const [fillIndex, setFillIndex] = useState(0);
  const [voidIndex, setVoidIndex] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);
  const getFillColor = useCallback(() => colors[fillIndex], [fillIndex]);
  const getVoidColor = useCallback(() => colors[voidIndex], [voidIndex]);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const grid = useMemo(() => generate(d.design, d.number, d.level), [d.design, d.number, d.level]);
  useEffect(() => {
    if (!canvasRef.current || !grid) return;
    const size = grid.length;
    const scale = Math.max(1, Math.ceil(512 / size));
    canvasRef.current.width = size * scale;
    canvasRef.current.height = size * scale;
    render(canvasRef.current, grid, getFillColor().color, getVoidColor().color);
  }, [grid, getFillColor, getVoidColor]);
  const handleDownloadPNG = (size: number) => {
    if (!grid) return;
    const exportCanvas = document.createElement("canvas");
    exportCanvas.width = size;
    exportCanvas.height = size;
    render(exportCanvas, grid, getFillColor().color, getVoidColor().color);
    saveCanvasPng(exportCanvas, size);
  };
  const handleDownloadSVG = () => {
    if (!grid) return;
    const svg = toSVG(grid, getFillColor().color, getVoidColor().color);
    saveSvgString(svg);
  };
  return (
    <ListBox>
      <BorderBox>
        <ListBox>
          <CardBox ref={containerRef} style={{ backgroundColor: getVoidColor().color.toCSS() }}>
            <canvas ref={canvasRef} className="fill" style={{ imageRendering: "pixelated" }} />
          </CardBox>
          <GridBox cols={3}>
            <InfoBox>grid: {d.gridCount}</InfoBox>
            <InfoBox>fill: {d.fillCount}</InfoBox>
            <InfoBox>void: {d.voidCount}</InfoBox>
          </GridBox>
          <GridBox cols={4}>
            <LinkBox onClick={d.cycleDesign}>{d.design}</LinkBox>
            <LinkBox onClick={d.cycleNumber}>{d.number}</LinkBox>
            <LinkBox onClick={d.cycleLevel}>{d.level}</LinkBox>
            <LinkBox onClick={d.cycleMaxUnits}>{d.maxUnitsLabel}</LinkBox>
          </GridBox>
          <GridBox cols={2}>
            <LinkBox onClick={() => setFillIndex((i) => (i + 1) % colors.length)}>{getFillColor().name}</LinkBox>
            <LinkBox onClick={() => setVoidIndex((i) => (i + 1) % colors.length)}>{getVoidColor().name}</LinkBox>
          </GridBox>
          <GridBox cols={3}>
            <ScreenshotButton onSave={handleDownloadPNG} />
            <LinkBox onClick={handleDownloadSVG}>SVG</LinkBox>
          </GridBox>
        </ListBox>
      </BorderBox>
    </ListBox>
  );
}
