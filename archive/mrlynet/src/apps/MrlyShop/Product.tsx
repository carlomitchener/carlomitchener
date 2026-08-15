import { useState, useCallback } from "react";
import { BorderBox, ListBox, GridBox, LinkBox, OutBox } from "../../components/System";
import { Controls } from "../../components/Controls";
import { useHeader } from "../../contexts/HeaderContext";
import { ExpiryInfo } from "../../components/ExpiryInfo";
import { Mockup, getCurrentAlt, findImageIndexByAlt } from "./Mockup";
import { Variations } from "./Variations";
import { Viewer } from "./Viewer";
import { EXPIRED_TIME, SHOP_URL, PRINTFUL_URL } from "./config";
import { getImage } from "./image";
import { copyToClipboard } from "../../lib/browser/clipboard";
import { addToCart } from "./cart";
import { useExpiry } from "../../hooks/useExpiry";
import type { ProductTuple, Products } from "./types";
import { P, V, I } from "./types";

function updateProductUrl(handle: string): void {
  const path = `/shop/products/${handle}`;
  window.history.replaceState({ view: "shop" }, "", path);
}

function ProductActions({
  product,
  selectedVariantId,
  onVariantSelect,
  onAddToCart,
  added,
  title,
}: {
  product: ProductTuple;
  selectedVariantId: string;
  onVariantSelect: (id: string) => void;
  onAddToCart: () => void;
  added: boolean;
  title: string;
}) {
  const [shared, setShared] = useState(false);
  const createdAt = product[P.CREATED_AT];
  const { isExpired } = useExpiry(createdAt, EXPIRED_TIME);

  const handleShare = useCallback(async () => {
    const url = `${window.location.origin}/shop/products/${product[P.HANDLE]}`;
    const text = `${title.toLowerCase()} - mrly.net`;
    if (navigator.share) {
      try {
        await navigator.share({ title: text, url });
        return;
      } catch {

      }
    }
    const ok = await copyToClipboard(url);
    if (ok) {
      setShared(true);
      setTimeout(() => setShared(false), 1500);
    }
  }, [product, title]);

  if (isExpired) return null;

  const variants = product[P.VARIANTS];
  const selectedVariant = variants?.find((v) => v[V.ID] === selectedVariantId) || variants?.[0];
  const price = selectedVariant ? "$" + parseFloat(selectedVariant[V.PRICE]).toFixed(2) : "";
  const checkoutUrl = selectedVariant ? `${SHOP_URL}${selectedVariant[V.ID]}:1` : "";
  const sizeValues = [...new Set(variants?.map((v) => v[V.SIZE]) || [])];

  return (
    <>
      {sizeValues.length > 1 && (
        <GridBox cols={3}>
          {sizeValues.map((size) => (
            <LinkBox
              key={size}
              active={selectedVariant?.[V.SIZE] === size}
              onClick={() => {
                const variant = variants?.find((v) => v[V.SIZE] === size);
                if (variant) onVariantSelect(variant[V.ID]);
              }}
            >
              {size.toLowerCase()}
            </LinkBox>
          ))}
        </GridBox>
      )}
      <OutBox href={checkoutUrl}>{`buy now (${price})`}</OutBox>
      <LinkBox onClick={onAddToCart}>{added ? "added!" : `add to cart`}</LinkBox>
      <LinkBox onClick={handleShare}>{shared ? "copied!" : "share"}</LinkBox>
    </>
  );
}

interface ProductProps {
  collection: ProductTuple[];
  initialIndex: number;
  productsJson: Products;
}

export function Product({ collection, initialIndex, productsJson }: ProductProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [imageIndex, setImageIndex] = useState(0);
  const [tileIndex, setTileIndex] = useState(1);
  const [added, setAdded] = useState(false);

  const product = collection[currentIndex];
  useHeader({ text: product[P.HANDLE] });
  const [selectedVariantId, setSelectedVariantId] = useState<string>(product[P.VARIANTS]?.[0]?.[V.ID] || "");

  const navigateToProduct = useCallback(
    (nextIndex: number) => {
      const nextProduct = collection[nextIndex];
      const alt = getCurrentAlt(product[P.IMAGES], imageIndex);
      setCurrentIndex(nextIndex);
      setSelectedVariantId(nextProduct[P.VARIANTS]?.[0]?.[V.ID] || "");
      setImageIndex(findImageIndexByAlt(nextProduct[P.IMAGES], alt));
      setAdded(false);
      updateProductUrl(nextProduct[P.HANDLE]);
    },
    [collection, product, imageIndex]
  );

  const goPrevProduct = useCallback(() => {
    if (collection.length <= 1) return;
    navigateToProduct((currentIndex - 1 + collection.length) % collection.length);
  }, [collection.length, currentIndex, navigateToProduct]);
  const goNextProduct = useCallback(() => {
    if (collection.length <= 1) return;
    navigateToProduct((currentIndex + 1) % collection.length);
  }, [collection.length, currentIndex, navigateToProduct]);

  const variants = product[P.VARIANTS];
  const selectedVariant = variants?.find((v) => v[V.ID] === selectedVariantId) || variants?.[0];

  const productType = product[P.PRODUCT_TYPE];
  const entry = productsJson[productType];
  const parts = entry ? entry.split(", ") : [];
  const title = parts[1] || "product";
  const link = parts[2] || "";
  const printfulUrl = `${PRINTFUL_URL}${link}`;
  const titleDisplay = title.toLowerCase();

  const handleAddToCart = useCallback(() => {
    if (!selectedVariant) return;
    const images = product[P.IMAGES];
    const visibleImage = images?.[Math.min(imageIndex, Math.max(0, (images?.length || 1) - 1))];
    const imageUrl = visibleImage ? getImage(visibleImage[I.KEY], product[P.HANDLE]) : "";
    addToCart({
      variantId: selectedVariant[V.ID],
      handle: product[P.HANDLE],
      title: title.toLowerCase(),
      size: selectedVariant[V.SIZE],
      price: selectedVariant[V.PRICE],
      image: imageUrl,
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  }, [selectedVariant, product, title, imageIndex]);

  return (
    <BorderBox>
      <ListBox>
        <OutBox href={printfulUrl}>{titleDisplay}</OutBox>
        <Mockup
          images={product[P.IMAGES]}
          handle={product[P.HANDLE]}
          imageIndex={imageIndex}
          onImageIndexChange={setImageIndex}
        />
        <Controls current={currentIndex + 1} total={collection.length} onPrev={goPrevProduct} onNext={goNextProduct} />
        <ExpiryInfo ts={product[P.CREATED_AT]} />
        <ProductActions
          product={product}
          selectedVariantId={selectedVariantId}
          onVariantSelect={setSelectedVariantId}
          onAddToCart={handleAddToCart}
          added={added}
          title={title}
        />
        <Variations collection={collection} onSelect={navigateToProduct} currentIndex={currentIndex} />
        <Viewer handle={product[P.HANDLE]} tileIndex={tileIndex} onTileIndexChange={setTileIndex} />
      </ListBox>
    </BorderBox>
  );
}
