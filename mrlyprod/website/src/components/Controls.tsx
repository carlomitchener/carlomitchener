import { GridBox, LinkBox, InfoBox } from "./System";
import { MrlyIcon } from "./MrlyIcon";

interface ControlsProps {
  current: number;
  total: number;
  onPrev: () => void;
  onNext: () => void;
}

export const Controls = ({ current, total, onPrev, onNext }: ControlsProps) => {
  return (
    <GridBox cols={3}>
      <LinkBox onClick={onPrev}>
        <MrlyIcon text="←" />
      </LinkBox>
      <InfoBox>
        {current} / {total}
      </InfoBox>
      <LinkBox onClick={onNext}>
        <MrlyIcon text="→" />
      </LinkBox>
    </GridBox>
  );
};
