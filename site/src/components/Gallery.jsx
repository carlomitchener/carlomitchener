import { grid } from "../lib/shop.ts";
import { Icon } from "./Icon.jsx";

export function Carousel({ slides, keys = false, pixel = false, full = false, label }) {
  const first = slides[0];
  const many = slides.length > 1;
  return (
    <div className={pixel ? "gallery pixel" : "gallery"} data-gallery data-keys={keys ? "" : undefined}>
      <div className="stage">
        {first ? (
          <button type="button" className={full ? "shot zoom" : "shot"} data-stage-button={full ? "" : undefined} aria-label={full ? "All images" : undefined}>
            <img src={first.full} alt={first.alt} width="1200" height="1200" fetchPriority={keys ? "high" : undefined} decoding="async" data-stage data-style={first.style} />
          </button>
        ) : null}
        {full ? (
          <button type="button" className="arrow full" data-open-full aria-label="All images">
            <Icon name="fullscreen" />
          </button>
        ) : null}
        {many ? (
          <>
            <button type="button" className="arrow prev" data-prev aria-label="Previous">
              <Icon name="chevron_left" />
            </button>
            <button type="button" className="arrow next" data-next aria-label="Next">
              <Icon name="chevron_right" />
            </button>
            <span className="count" data-count>{`1 / ${slides.length}`}</span>
          </>
        ) : null}
      </div>
      {many ? (
        <div className="thumbs" data-thumbs>
          {slides.map((slide, i) => (
            <button type="button" key={slide.style} data-thumb={i} data-style={slide.style} aria-pressed={i === 0 ? "true" : "false"} aria-label={slide.alt || `${label} ${i + 1}`}>
              <img src={slide.thumb} alt="" width="400" height="400" loading="lazy" decoding="async" data-style={slide.style} data-full={slide.full} data-link={slide.link} data-alt={slide.alt} data-name={slide.name} />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export const mockupSlides = (product) =>
  product.images.map((image) => ({
    style: image.style,
    thumb: grid(image.url, 400),
    full: grid(image.url, 1200),
    link: grid(image.url, 2000),
    alt: image.alt || product.title,
    name: image.style,
  }));

export function Gallery({ product }) {
  return <Carousel slides={mockupSlides(product)} keys full label="Image" />;
}

export function Mockups({ product, width = 800 }) {
  return (
    <div className="shots" data-grid>
      {product.images.map((image, i) => (
        <button type="button" key={image.style} data-jump={i} data-style={image.style} aria-label={image.alt || product.title}>
          <img src={grid(image.url, width)} alt="" width={width} height={width} loading="lazy" decoding="async" data-style={image.style} />
        </button>
      ))}
    </div>
  );
}

export function FullGrid({ product }) {
  return (
    <dialog className="all" data-full aria-label="All images">
      <div className="bar">
        <span className="fine">{`${product.images.length} images`}</span>
        <button type="button" className="tool" data-close-full aria-label="Close">
          <Icon name="close" />
        </button>
      </div>
      <Mockups product={product} width={1200} />
    </dialog>
  );
}
