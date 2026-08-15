import { BorderBox, CardBox, InfoBox, ListBox } from "../../components/System";
import { getImage } from "./image";
import type { ProductTuple } from "./types";
import { P, I } from "./types";

interface FeedProps {
  products: ProductTuple[];
  onSelect: (index: number) => void;
}

export function Feed({ products, onSelect }: FeedProps) {
  if (!products.length) {
    return (
      <BorderBox>
        <InfoBox>oops! no products found</InfoBox>
      </BorderBox>
    );
  }
  return (
    <BorderBox>
      <ListBox>
        {products.map((product, index) => {
          const images = product[P.IMAGES];
          const handle = product[P.HANDLE];
          const img = images?.[0];
          return (
            <CardBox key={product[P.ID]} onClick={() => onSelect(index)}>
              {img && (
                <img
                  className="image"
                  src={getImage(img[I.KEY], handle)}
                  alt={img[I.ALT]}
                  decoding="async"
                  loading="lazy"
                />
              )}
            </CardBox>
          );
        })}
      </ListBox>
    </BorderBox>
  );
}
