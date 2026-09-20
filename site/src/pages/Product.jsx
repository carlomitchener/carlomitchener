import { useRef, useState } from "react";
import { SHOP } from "../config/shop.ts";
import { Breadcrumbs } from "../components/Breadcrumbs.jsx";
import { Carousel, FullGrid, Mockups, mockupSlides } from "../components/Gallery.jsx";
import { MoreVariations } from "../components/MoreVariations.jsx";
import { ProductDetails } from "../components/ProductDetails.jsx";
import { ProductGrid } from "../components/ProductGrid.jsx";
import { Strip } from "../components/Strip.jsx";
import { pickPrimary, useNow, usePrimary } from "../lib/hooks.ts";
import { left } from "../lib/life.ts";

export function Product({ trail, product, family, matching = [], alike = [], printful, shop, tiles, buyPrefix, review, preview = false, now: built }) {
  const primary = usePrimary("light");
  const one = product[primary] ?? product.light;
  const now = useNow(built);
  const [index, setIndex] = useState(0);
  const [size, setSize] = useState("");
  const box = useRef(null);
  const hold = useRef(null);
  const slides = mockupSlides(one.images, product.title);
  const at = index < slides.length ? index : 0;
  const variant = one.variants.find((each) => each.size === size) ?? one.variants[0];
  const dead = Boolean(one.released) && left(one.released, now) <= 0;
  const jump = (i) => {
    setIndex(i);
    if (box.current?.open) box.current.close();
    else hold.current?.scrollIntoView({ block: "start", behavior: "smooth" });
  };
  return (
    <div className="wrap">
      <Breadcrumbs trail={trail} />
      <article className="product" data-primary={primary}>
        <div className="left">
          <Carousel slides={slides} index={at} onIndex={setIndex} keys full label="Image" hold={hold} onFull={() => box.current?.showModal()} />
          <Mockups images={one.images} title={product.title} onJump={jump} />
        </div>
        <div className="side">
          <ProductDetails
            product={product}
            one={one}
            primary={primary}
            onPrimary={pickPrimary}
            variant={variant}
            size={variant ? variant.size : ""}
            onSize={setSize}
            image={slides[at] ? slides[at].full : ""}
            buyPrefix={buyPrefix}
            printful={printful}
            shop={shop}
            tiles={tiles}
            now={built}
            review={review}
            preview={preview}
            dead={dead}
          />
          <MoreVariations family={family} current={product.design} title={product.title} shop={shop} />
        </div>
      </article>
      {matching.length ? (
        <section className="alike" aria-labelledby="matching">
          <Strip id="matching" title="Matching Products" href={`${SHOP}?design=${product.design}`} more={`All ${product.design}`} />
          <ProductGrid products={matching} now={built} />
        </section>
      ) : null}
      {alike.length ? (
        <section className="alike" aria-labelledby="alike">
          <Strip id="alike" title="You May Also Like" href={SHOP} more="All variations" />
          <ProductGrid products={alike} now={built} />
        </section>
      ) : null}
      <FullGrid images={one.images} title={product.title} box={box} onJump={jump} />
    </div>
  );
}
