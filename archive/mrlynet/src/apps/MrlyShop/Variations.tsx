import { GridBox, CardBox } from "../../components/System";
import { Tile } from "./Tile";
import type { ProductTuple } from "./types";
import { P } from "./types";

interface VariationsProps {
  collection: ProductTuple[];
  onSelect: (collectionIndex: number) => void;
  currentIndex: number;
}

export function Variations({ collection, onSelect, currentIndex }: VariationsProps) {
  return (
    <GridBox cols={3}>
      {collection.map((product) => {
        const handle = product[P.HANDLE];
        const collectionIndex = collection.indexOf(product);
        return (
          <CardBox
            key={product[P.ID]}
            onClick={() => onSelect(collectionIndex)}
            className={collectionIndex === currentIndex ? "outline" : ""}
          >
            <Tile handle={handle} />
          </CardBox>
        );
      })}
    </GridBox>
  );
}
