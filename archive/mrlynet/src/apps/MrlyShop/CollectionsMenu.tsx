import { BorderBox, GridBox, InfoBox, ListBox } from "../../components/System";
import { Emoji } from "../../components/Emoji";
import { SHOP_CATEGORIES } from "./categories";
interface CollectionsMenuProps {
  onSelect: (category: string | null) => void;
}

export function CollectionsMenu({ onSelect }: CollectionsMenuProps) {
  return (
    <ListBox>
      <BorderBox>
        <GridBox cols={3}>
          {SHOP_CATEGORIES.map((entry) => (
            <ListBox key={entry.label}>
              <Emoji emoji={entry.emoji} onClick={() => onSelect(entry.category)} />
              <InfoBox>{entry.label}</InfoBox>
            </ListBox>
          ))}
        </GridBox>
      </BorderBox>
    </ListBox>
  );
}
