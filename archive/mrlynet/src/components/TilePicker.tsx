import React, { useEffect, useMemo, useRef, useState } from "react";
import { MRLY_DESIGNS, MRLY_NUMBERS, getAllowedLevels } from "../mrly";
import { mjColors } from "../lib/colors";
import { generate, render } from "../lib/fractal";
import { BorderBox, CardBox, GridBox, InfoBox, LinkBox, ListBox, OverlayBox } from "./System";

export interface TilePickerValue {
  design: string;
  number: number;
  level: number;
  invert?: boolean;
}

interface TilePickerProps {
  value: TilePickerValue;
  onPick: (value: TilePickerValue) => void;
  label?: string;
  maxUnits?: number;
}

export function TilePicker({ value, onPick, label = "tile", maxUnits = 4096 }: TilePickerProps) {
  const [open, setOpen] = useState(false);
  const invSuffix = value.invert ? " inv" : "";
  const summary = `${label}: ${value.design} ${value.number}.${value.level}${invSuffix}`;
  const handlePick = (next: TilePickerValue) => {
    onPick(next);
    setOpen(false);
  };
  return (
    <>
      <LinkBox onClick={() => setOpen(true)}>{summary}</LinkBox>
      {open && (
        <TilePickerOverlay
          value={value}
          maxUnits={maxUnits}
          onPick={handlePick}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}

interface TilePickerOverlayProps {
  value: TilePickerValue;
  maxUnits: number;
  onPick: (value: TilePickerValue) => void;
  onClose: () => void;
}

function TilePickerOverlay({ value, maxUnits, onPick, onClose }: TilePickerOverlayProps) {
  const [design, setDesign] = useState(value.design);
  const [number, setNumber] = useState<number>(value.number);
  const [invert, setInvert] = useState<boolean>(value.invert === true);
  const allowedLevels = useMemo(() => getAllowedLevels(number, maxUnits, 2), [number, maxUnits]);
  const stopPropagation = (e: React.MouseEvent) => e.stopPropagation();
  return (
    <OverlayBox
      onClick={onClose}
      style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem", zIndex: 100 }}
    >
      <div onClick={stopPropagation} style={{ width: "100%", maxWidth: "32rem" }}>
        <BorderBox>
          <ListBox>
            <GridBox cols={MRLY_DESIGNS.length}>
              {MRLY_DESIGNS.map((d) => (
                <LinkBox key={d} active={d === design} onClick={() => setDesign(d)}>
                  design: {d}
                </LinkBox>
              ))}
            </GridBox>
            <GridBox cols={MRLY_NUMBERS.length}>
              {MRLY_NUMBERS.map((n) => (
                <LinkBox key={n} active={n === number} onClick={() => setNumber(n)}>
                  number: {n}
                </LinkBox>
              ))}
            </GridBox>
            <LinkBox active={invert} onClick={() => setInvert((v) => !v)}>
              invert: {invert ? "on" : "off"}
            </LinkBox>
            <GridBox cols={3}>
              {allowedLevels.map((lvl) => (
                <Thumb
                  key={lvl}
                  design={design}
                  number={number}
                  level={lvl}
                  invert={invert}
                  active={
                    lvl === value.level &&
                    design === value.design &&
                    number === value.number &&
                    invert === (value.invert === true)
                  }
                  onClick={() => onPick({ design, number, level: lvl, invert })}
                />
              ))}
            </GridBox>
            <LinkBox onClick={onClose}>picker: close</LinkBox>
          </ListBox>
        </BorderBox>
      </div>
    </OverlayBox>
  );
}

interface ThumbProps {
  design: string;
  number: number;
  level: number;
  active: boolean;
  invert?: boolean;
  onClick: () => void;
}

function Thumb({ design, number, level, active, invert, onClick }: ThumbProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (!canvasRef.current) return;
    const base = generate(design, number, level);
    const grid = invert ? base.map((row) => row.map((v) => 1 - v)) : base;
    const size = grid.length;
    const scale = Math.max(1, Math.floor(128 / size));
    canvasRef.current.width = size * scale;
    canvasRef.current.height = size * scale;
    render(canvasRef.current, grid, mjColors[0].color, mjColors[1].color);
  }, [design, number, level, invert]);
  return (
    <CardBox
      active={active}
      onClick={onClick}
      style={{ aspectRatio: "1 / 1", position: "relative", cursor: "pointer", backgroundColor: mjColors[1].color.toCSS() }}
    >
      <canvas ref={canvasRef} className="fill" style={{ imageRendering: "pixelated" }} />
      <InfoBox style={{ position: "absolute", bottom: 0, left: 0, right: 0 }}>level: {level}</InfoBox>
    </CardBox>
  );
}
