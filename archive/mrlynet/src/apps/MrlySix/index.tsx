import { useState, useRef, useMemo } from "react";
import { generate3d, iso, pro, cut, renderHex, toSVGHex, VOID, FILL, UP, LEFT, RIGHT } from "../../lib/fractal";
import { mjColors as colors } from "../../lib/colors";
import { BorderBox, ListBox, LinkBox, GridBox, CardBox, InfoBox } from "../../components/System";
import { ScreenshotButton } from "../../components/ScreenshotButton";
import { MrlyHex, type HexColorMap } from "../../components/MrlyHex";
import { MRLY_DESIGNS_3D } from "../../mrly";
import { useDesigner } from "../../hooks/useDesigner";
import { saveCanvasPng, saveSvgString } from "../../lib/browser/screenshot";

const VIEWS = ["iso", "pro", "cut"];

export function MrlySix() {
  const d = useDesigner({ designs: MRLY_DESIGNS_3D, dimension: 6, defaultNumberIndex: 1 });
  const [viewIndex, setViewIndex] = useState(0);
  const [bgIndex, setBgIndex] = useState(0);
  const [upIndex, setUpIndex] = useState(3);
  const [leftIndex, setLeftIndex] = useState(5);
  const [rightIndex, setRightIndex] = useState(7);
  const [fillIndex, setFillIndex] = useState(2);
  const [voidIndex, setVoidIndex] = useState(8);
  const containerRef = useRef<HTMLDivElement>(null);
  const getView = () => VIEWS[viewIndex];
  const sponge = useMemo(() => generate3d(d.design, d.number, d.level), [d.design, d.number, d.level]);

  const hexGrid = useMemo(() => {
    const view = VIEWS[viewIndex];
    if (view === "iso") return iso(sponge);
    if (view === "pro") return pro(sponge);
    if (view === "cut") return cut(sponge);
    return null;
  }, [sponge, viewIndex]);

  const hexColors = useMemo<HexColorMap>(() => {
    const map: HexColorMap = {};
    const view = VIEWS[viewIndex];
    if (view === "iso") {
      map[UP] = colors[upIndex].color;
      map[LEFT] = colors[leftIndex].color;
      map[RIGHT] = colors[rightIndex].color;
    } else {
      map[FILL] = colors[fillIndex].color;
      map[VOID] = colors[voidIndex].color;
    }
    return map;
  }, [viewIndex, upIndex, leftIndex, rightIndex, fillIndex, voidIndex]);

  const handleDownloadPNG = (size: number) => {
    if (!hexGrid) return;
    const exportCanvas = document.createElement("canvas");
    exportCanvas.width = size;
    exportCanvas.height = size;
    const ctx = exportCanvas.getContext("2d");
    if (ctx) {
      ctx.fillStyle = colors[bgIndex].color.toCSS();
      ctx.fillRect(0, 0, size, size);
    }
    const map: HexColorMap = {};
    const view = getView();
    if (view === "iso") {
      map[UP] = colors[upIndex].color;
      map[LEFT] = colors[leftIndex].color;
      map[RIGHT] = colors[rightIndex].color;
    } else {
      map[FILL] = colors[fillIndex].color;
      map[VOID] = colors[voidIndex].color;
    }
    const start = view === "iso" || view === "pro" ? 1 : 0;
    renderHex(exportCanvas, hexGrid, map, start);
    saveCanvasPng(exportCanvas, size);
  };

  const handleDownloadSVG = () => {
    if (!hexGrid) return;
    const map: HexColorMap = {};
    const view = getView();
    if (view === "iso") {
      map[UP] = colors[upIndex].color;
      map[LEFT] = colors[leftIndex].color;
      map[RIGHT] = colors[rightIndex].color;
    } else {
      map[FILL] = colors[fillIndex].color;
      map[VOID] = colors[voidIndex].color;
    }
    const start = view === "iso" || view === "pro" ? 1 : 0;
    const backgroundColor = colors[bgIndex].color.toCSS();
    const svgContent = toSVGHex(hexGrid, map, start, backgroundColor);
    saveSvgString(svgContent);
  };

  return (
    <ListBox>
      <ListBox>
        <BorderBox>
          <CardBox ref={containerRef} style={{ backgroundColor: colors[bgIndex].color.toCSS() }}>
            <MrlyHex
              design={d.design}
              number={d.number}
              level={d.level}
              view={getView() as "iso" | "pro" | "cut"}
              colors={hexColors}
            />
          </CardBox>
        </BorderBox>
        <BorderBox>
          <GridBox cols={3}>
            <InfoBox>grid: {d.gridCount}</InfoBox>
            <InfoBox>fill: {d.fillCount}</InfoBox>
            <InfoBox>void: {d.voidCount}</InfoBox>
          </GridBox>
        </BorderBox>
        <BorderBox>
          <GridBox cols={4}>
            <LinkBox onClick={d.cycleDesign}>{d.design}</LinkBox>
            <LinkBox onClick={d.cycleNumber}>{d.number}</LinkBox>
            <LinkBox onClick={d.cycleLevel}>{d.level}</LinkBox>
            <LinkBox onClick={d.cycleMaxUnits}>{d.maxUnitsLabel}</LinkBox>
          </GridBox>
        </BorderBox>
        <BorderBox>
          <GridBox cols={2}>
            <LinkBox onClick={() => setViewIndex((i) => (i + 1) % VIEWS.length)}>mode: {getView()}</LinkBox>
            <LinkBox onClick={() => setBgIndex((i) => (i + 1) % colors.length)}>bg: {colors[bgIndex].name}</LinkBox>
          </GridBox>
        </BorderBox>
        <BorderBox>
          {getView() === "iso" ? (
            <GridBox cols={3}>
              <LinkBox onClick={() => setUpIndex((i) => (i + 1) % colors.length)}>up ({colors[upIndex].name})</LinkBox>
              <LinkBox onClick={() => setLeftIndex((i) => (i + 1) % colors.length)}>
                left ({colors[leftIndex].name})
              </LinkBox>
              <LinkBox onClick={() => setRightIndex((i) => (i + 1) % colors.length)}>
                right ({colors[rightIndex].name})
              </LinkBox>
            </GridBox>
          ) : (
            <GridBox cols={2}>
              <LinkBox onClick={() => setFillIndex((i) => (i + 1) % colors.length)}>
                fill ({colors[fillIndex].name})
              </LinkBox>
              <LinkBox onClick={() => setVoidIndex((i) => (i + 1) % colors.length)}>
                void ({colors[voidIndex].name})
              </LinkBox>
            </GridBox>
          )}
        </BorderBox>
        <BorderBox>
          <GridBox cols={3}>
            <ScreenshotButton onSave={handleDownloadPNG} />
            <LinkBox onClick={handleDownloadSVG}>SVG</LinkBox>
          </GridBox>
        </BorderBox>
      </ListBox>
    </ListBox>
  );
}
