import { COLORS } from "../../lib/colors";
import { GridBox, LinkBox } from "../System";

interface SettingSwatchesProps {
  value: string | null;
  onChange: (next: string | null) => void;
  cols?: number;
}

const css = (r: number, g: number, b: number) => `rgb(${r},${g},${b})`;

export const SettingSwatches = ({ value, onChange, cols = 8 }: SettingSwatchesProps) => {
  return (
    <GridBox cols={cols}>
      <LinkBox active={value === null} onClick={() => onChange(null)}>
        AUTO
      </LinkBox>
      {COLORS.map((c) => {
        const color = css(c.r, c.g, c.b);
        const selected = value === color;
        return (
          <LinkBox
            key={c.name}
            active={selected}
            onClick={() => onChange(color)}
            style={{ backgroundColor: color, color: "transparent" }}
          >
            .
          </LinkBox>
        );
      })}
    </GridBox>
  );
};
