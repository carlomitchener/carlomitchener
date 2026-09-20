import { useEffect, useRef } from "react";
import { grid } from "../lib/shop.ts";
import { Icon } from "./Icon.jsx";

const typing = (target) => target instanceof HTMLElement && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName);

export function Carousel({ slides, index, onIndex, keys = false, pixel = false, full = false, hold, onFull, label }) {
  const many = slides.length > 1;
  const one = slides[index] ?? slides[0];
  const strip = useRef(null);
  const swiped = useRef(false);
  const from = useRef([0, 0]);
  const first = useRef(true);
  const step = (delta) => onIndex((((index + delta) % slides.length) + slides.length) % slides.length);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    strip.current?.children[index]?.scrollIntoView({ block: "nearest", inline: "center", behavior: "smooth" });
  }, [index]);

  useEffect(() => {
    if (!keys) return;
    const down = (event) => {
      if (event.metaKey || event.ctrlKey || event.altKey || typing(event.target)) return;
      if (event.key === "ArrowLeft") step(-1);
      else if (event.key === "ArrowRight") step(1);
      else return;
      event.preventDefault();
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  });

  return (
    <div className={pixel ? "gallery pixel" : "gallery"} ref={hold}>
      <div className="stage">
        {one ? (
          <button
            type="button"
            className={full ? "shot zoom" : "shot"}
            aria-label={full ? "All images" : undefined}
            onPointerDown={(event) => {
              from.current = [event.clientX, event.clientY];
              swiped.current = false;
            }}
            onPointerUp={(event) => {
              const dx = event.clientX - from.current[0];
              if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(event.clientY - from.current[1])) {
                swiped.current = true;
                step(dx < 0 ? 1 : -1);
              }
            }}
            onClick={() => {
              if (full && !swiped.current && matchMedia("(min-width: 900px)").matches) onFull?.();
            }}
          >
            <img src={one.full} alt={one.alt} width="1200" height="1200" fetchPriority={keys ? "high" : undefined} decoding="async" />
          </button>
        ) : null}
        {full ? (
          <button type="button" className="arrow full" aria-label="All images" onClick={() => onFull?.()}>
            <Icon name="fullscreen" />
          </button>
        ) : null}
        {many ? (
          <>
            <button type="button" className="arrow prev" aria-label="Previous" onClick={() => step(-1)}>
              <Icon name="chevron_left" />
            </button>
            <button type="button" className="arrow next" aria-label="Next" onClick={() => step(1)}>
              <Icon name="chevron_right" />
            </button>
            <span className="count">{`${index + 1} / ${slides.length}`}</span>
          </>
        ) : null}
      </div>
      {many ? (
        <div className="thumbs" ref={strip}>
          {slides.map((slide, i) => (
            <button type="button" key={slide.style} aria-pressed={i === index ? "true" : "false"} aria-label={slide.alt || `${label} ${i + 1}`} onClick={() => onIndex(i)}>
              <img src={slide.thumb} alt="" width="400" height="400" loading="lazy" decoding="async" />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export const mockupSlides = (images, title) =>
  images.map((image) => ({
    style: image.style,
    thumb: grid(image.url, 400),
    full: grid(image.url, 1200),
    link: grid(image.url, 2000),
    alt: image.alt || title,
    name: image.style,
  }));

export function Mockups({ images, title, width = 800, onJump }) {
  return (
    <div className="shots">
      {images.map((image, i) => (
        <button type="button" key={image.style} aria-label={image.alt || title} onClick={() => onJump?.(i)}>
          <img src={grid(image.url, width)} alt="" width={width} height={width} loading="lazy" decoding="async" />
        </button>
      ))}
    </div>
  );
}

export function FullGrid({ images, title, box, onJump }) {
  return (
    <dialog className="all" aria-label="All images" ref={box} onClick={(event) => event.target === box.current && box.current?.close()}>
      <div className="bar">
        <span className="fine">{`${images.length} images`}</span>
        <button type="button" className="tool" aria-label="Close" onClick={() => box.current?.close()}>
          <Icon name="close" />
        </button>
      </div>
      <Mockups images={images} title={title} width={1200} onJump={onJump} />
    </dialog>
  );
}
