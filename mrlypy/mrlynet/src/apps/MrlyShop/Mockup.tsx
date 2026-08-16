import { useRef, useCallback } from "react";

import { getImage } from "./image";
import type { ImageTuple } from "./types";
import { I } from "./types";

interface MockupProps {
  images: ImageTuple[];
  handle: string;
  imageIndex: number;
  onImageIndexChange: (index: number) => void;
}

export function Mockup({ images, handle, imageIndex, onImageIndexChange }: MockupProps) {
  const index = Math.min(imageIndex, Math.max(0, images.length - 1));
  const loaded = useRef<Set<number>>(new Set([0, images.length > 1 ? 1 : 0]));
  if (imageIndex >= 0) {
    loaded.current.add(imageIndex);
    if (images.length > 1) loaded.current.add((imageIndex + 1) % images.length);
  }
  const handleClick = useCallback(() => {
    const next = (index + 1) % images.length;
    const preload = (next + 1) % images.length;
    loaded.current.add(next);
    loaded.current.add(preload);
    onImageIndexChange(next);
  }, [images.length, index, onImageIndexChange]);
  if (!images.length) return null;
  return (
    <div className="carousel" onClick={handleClick}>
      {images.map((img, i) => {
        const isVisible = i === index;
        const shouldLoad = loaded.current.has(i);
        const key = img[I.KEY];
        return (
          <img
            key={key + i}
            className={isVisible ? "image visible" : "image"}
            src={shouldLoad ? getImage(key, handle) : undefined}
            data-src={!shouldLoad ? getImage(key, handle) : undefined}
            decoding="sync"
            loading="eager"
            alt={img[I.ALT]}
          />
        );
      })}
    </div>
  );
}

export function getCurrentAlt(images: ImageTuple[], imageIndex: number): string {
  const idx = Math.min(imageIndex, Math.max(0, images.length - 1));
  return images[idx]?.[I.ALT] || "";
}

export function findImageIndexByAlt(images: ImageTuple[], alt: string): number {
  if (!alt) return 0;
  const idx = images.findIndex((img) => img[I.ALT] === alt);
  return idx >= 0 ? idx : 0;
}
