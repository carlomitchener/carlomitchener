import { useState, useMemo } from "react";
import { BorderBox, ListBox, LinkBox, GridBox, CardBox, InfoBox } from "../../components/System";
import { MrlyIcon } from "../../components/MrlyIcon";
import { Controls } from "../../components/Controls";
import { mrlyFont } from "../../lib/mrlyfont";

const DOWNLOADS = [
  { label: "ttf", href: "/MrlyFont.ttf" },
  { label: "woff", href: "/MrlyFont.woff" },
  { label: "woff2", href: "/MrlyFont.woff2" },
  { label: "json", href: "/mrlyfont.json" },
];

export function MrlyFont() {
  const chars = useMemo(() => Object.keys(mrlyFont), []);
  const [index, setIndex] = useState(0);
  const char = chars[index];
  const goPrev = () => setIndex((i) => (i - 1 + chars.length) % chars.length);
  const goNext = () => setIndex((i) => (i + 1) % chars.length);
  return (
    <ListBox>
      <BorderBox>
        <ListBox>
          <InfoBox>{mrlyFont[char].name.toLowerCase()}</InfoBox>
          <CardBox>
            <MrlyIcon text={char} scramble={true} key={index} />
          </CardBox>
          <InfoBox>
            {mrlyFont[char].w} x {mrlyFont[char].h}
          </InfoBox>
          <Controls current={index + 1} total={chars.length} onPrev={goPrev} onNext={goNext} />
        </ListBox>
      </BorderBox>
      <BorderBox>
        <GridBox cols={7}>
          {chars.map((c, i) => (
            <CardBox key={c} onClick={() => setIndex(i)} active={i === index}>
              <MrlyIcon text={c} scramble={false} style={{ filter: i === index ? "invert(1)" : undefined }} />
            </CardBox>
          ))}
        </GridBox>
      </BorderBox>
      <BorderBox>
        <GridBox cols={4}>
          {DOWNLOADS.map((d) => (
            <LinkBox key={d.label}>
              <a href={d.href} download style={{ color: "inherit", textDecoration: "none", display: "block" }}>
                {d.label}
              </a>
            </LinkBox>
          ))}
        </GridBox>
      </BorderBox>
    </ListBox>
  );
}
