import { BorderBox, CardBox, InfoBox, ListBox } from "../../components/System";
import { getImage } from "./image";
import type { ProductTuple, Products } from "./types";
import { P, I } from "./types";

interface CollectionViewProps {
  category: string | null;
  products: ProductTuple[];
  productsJson: Products;
  onSelect: (handle: string) => void;
}

export function CollectionView({ category, products, productsJson, onSelect }: CollectionViewProps) {
  // FILTER PRODUCT TYPES
  const entries = Object.entries(productsJson).filter(([, value]) => {
    if (!category) return true;
    return value.split(", ")[0] === category;
  });
  // BUILD CARDS
  const cards: { handle: string; title: string; imageUrl: string }[] = [];
  for (const [typeKey, value] of entries) {
    const title = value.split(", ")[1] || "product";
    const matching = products
      .filter((p) => p[P.PRODUCT_TYPE] === typeKey)
      .sort((a, b) => new Date(b[P.CREATED_AT]).getTime() - new Date(a[P.CREATED_AT]).getTime());
    const mostRecent = matching[0];
    if (!mostRecent) continue;
    const img = mostRecent[P.IMAGES]?.[0];
    if (!img) continue;
    cards.push({
      handle: mostRecent[P.HANDLE],
      title: title.toLowerCase(),
      imageUrl: getImage(img[I.KEY], mostRecent[P.HANDLE]),
    });
  }
  if (!cards.length) {
    return (
      <BorderBox>
        <InfoBox>no products found</InfoBox>
      </BorderBox>
    );
  }
  const title = category ? category.toLowerCase() : "all";
  return (
    <ListBox>
      <BorderBox>
        <InfoBox>{`${title} (${cards.length})`}</InfoBox>
      </BorderBox>
      {cards.map((card) => (
        <BorderBox key={card.handle}>
          <ListBox>
            <CardBox onClick={() => onSelect(card.handle)}>
              <img className="image" src={card.imageUrl} alt={card.title} decoding="async" loading="lazy" />
            </CardBox>
            <InfoBox>{card.title}</InfoBox>
          </ListBox>
        </BorderBox>
      ))}
    </ListBox>
  );
}
