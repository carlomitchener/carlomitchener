import { GridBox, InfoBox, LinkBox } from "../System";

interface SettingStepperProps {
  value: number;
  onChange: (next: number) => void;
  step?: number;
  min?: number;
  max?: number;
  format?: (value: number) => string;
}

export const SettingStepper = ({
  value,
  onChange,
  step = 1,
  min = -Infinity,
  max = Infinity,
  format,
}: SettingStepperProps) => {
  const dec = () => onChange(Math.max(min, value - step));
  const inc = () => onChange(Math.min(max, value + step));
  const display = format ? format(value) : String(value);
  return (
    <GridBox cols={3}>
      <LinkBox onClick={dec} disabled={value <= min}>−</LinkBox>
      <InfoBox>{display}</InfoBox>
      <LinkBox onClick={inc} disabled={value >= max}>+</LinkBox>
    </GridBox>
  );
};
