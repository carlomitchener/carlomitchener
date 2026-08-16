import type { Cell2d } from "../../mrly";
import { toImageData2d } from "../../mrly";

// FILENAME

function mrlyFilename(ext: string): string {
  return `mrly-${Date.now()}.${ext}`;
}

// DOWNLOAD

function downloadDataUrl(dataUrl: string, filename: string) {
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = filename;
  a.click();
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// TARGET SIZE

export const SCREENSHOT_SIZES = [500, 1000, 1500, 2000, 2500] as const;
const DEFAULT_SIZE = 1000;

// RESIZE

function resizeToTarget(source: HTMLCanvasElement | HTMLImageElement, targetSize: number): HTMLCanvasElement {
  const sw = source instanceof HTMLCanvasElement ? source.width : source.naturalWidth;
  const sh = source instanceof HTMLCanvasElement ? source.height : source.naturalHeight;
  if (sw === targetSize && sh === targetSize && source instanceof HTMLCanvasElement) return source;
  const offscreen = document.createElement("canvas");
  offscreen.width = targetSize;
  offscreen.height = targetSize;
  const ctx = offscreen.getContext("2d")!;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(source, 0, 0, targetSize, targetSize);
  return offscreen;
}

// CANVAS

export function saveCanvasPng(canvas: HTMLCanvasElement, targetSize: number = DEFAULT_SIZE) {
  const out = resizeToTarget(canvas, targetSize);
  downloadDataUrl(out.toDataURL("image/png"), mrlyFilename("png"));
}

// IMAGE

export function saveImagePng(img: HTMLImageElement, targetSize: number = DEFAULT_SIZE) {
  const out = resizeToTarget(img, targetSize);
  downloadDataUrl(out.toDataURL("image/png"), mrlyFilename("png"));
}

// CELL2D

export function saveCell2dPng(cell: Cell2d, targetSize: number = DEFAULT_SIZE) {
  const { width, height, data } = toImageData2d(cell, 1);
  const src = document.createElement("canvas");
  src.width = width;
  src.height = height;
  src.getContext("2d")!.putImageData(new ImageData(new Uint8ClampedArray(data), width, height), 0, 0);
  const offscreen = document.createElement("canvas");
  offscreen.width = targetSize;
  offscreen.height = targetSize;
  const ctx = offscreen.getContext("2d")!;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(src, 0, 0, targetSize, targetSize);
  downloadDataUrl(offscreen.toDataURL("image/png"), mrlyFilename("png"));
}

// URL IMAGE

export function saveUrlPng(url: string, targetSize: number = DEFAULT_SIZE) {
  const img = new Image();
  img.crossOrigin = "anonymous";
  img.onload = () => {
    const out = resizeToTarget(img, targetSize);
    downloadDataUrl(out.toDataURL("image/png"), mrlyFilename("png"));
  };
  img.onerror = () => window.open(url, "_blank");
  img.src = url;
}

// SVG

export function saveSvgElement(svg: SVGElement) {
  const data = new XMLSerializer().serializeToString(svg);
  downloadBlob(new Blob([data], { type: "image/svg+xml" }), mrlyFilename("svg"));
}

export function saveSvgString(content: string) {
  downloadBlob(new Blob([content], { type: "image/svg+xml" }), mrlyFilename("svg"));
}

// BLOB

export function saveBlobDownload(content: string, ext: string, type: string = "text/plain") {
  downloadBlob(new Blob([content], { type }), mrlyFilename(ext));
}
