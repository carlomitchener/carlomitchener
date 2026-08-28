import { BorderBox, LinkBox } from "../../components/System";
import { CATEGORIES } from "./config";

const ALL_CATEGORIES = ["all", ...CATEGORIES];

interface FilterProps {
  category: string | null;
  count: number;
  onChange: (category: string | null) => void;
}

export function Filter({ category, count, onChange }: FilterProps) {
  const currentLabel = category || "all";
  const handleClick = () => {
    const currentIndex = ALL_CATEGORIES.indexOf(currentLabel);
    const nextIndex = (currentIndex + 1) % ALL_CATEGORIES.length;
    const next = ALL_CATEGORIES[nextIndex];
    onChange(next === "all" ? null : next);
  };
  return (
    <BorderBox>
      <LinkBox onClick={handleClick}>{`${currentLabel.toLowerCase()} (${count})`}</LinkBox>
    </BorderBox>
  );
}
