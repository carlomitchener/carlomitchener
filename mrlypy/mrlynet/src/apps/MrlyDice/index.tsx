import { useState } from "react";
import { BorderBox, ListBox, CardBox, LinkBox, GridBox } from "../../components/System";
import { MrlyIcon } from "../../components/MrlyIcon";

const SIDES = [2, 4, 6, 8, 10, 12, 20];

export function MrlyDice() {
  const [sideIndex, setSideIndex] = useState(2);
  const max = SIDES[sideIndex];
  const [result, setResult] = useState(1);
  const [key, setKey] = useState(0);
  const roll = () => {
    setResult(Math.floor(Math.random() * max) + 1);
    setKey((k) => k + 1);
  };
  const cycleSides = () => setSideIndex((i) => (i + 1) % SIDES.length);
  return (
    <ListBox>
      <BorderBox>
        <ListBox>
          <CardBox style={{ cursor: "pointer" }} onClick={roll}>
            <MrlyIcon text={String(result)} scramble={true} key={key} />
          </CardBox>
          <GridBox cols={2}>
            <LinkBox onClick={cycleSides}>d{max}</LinkBox>
            <LinkBox onClick={roll}>roll</LinkBox>
          </GridBox>
        </ListBox>
      </BorderBox>
    </ListBox>
  );
}
