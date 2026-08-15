import { useState, useCallback } from "react";
import { BorderBox, ListBox, CardBox, InfoBox, GridBox, LinkBox } from "../../components/System";
import { COLORS, type ColorDef } from "../../lib/colors";
import { copyToClipboard } from "../../lib/browser/clipboard";

function toHex(c: ColorDef): string {
  return `#${c.r.toString(16).padStart(2, "0")}${c.g.toString(16).padStart(2, "0")}${c.b.toString(16).padStart(2, "0")}`;
}

export function MrlyColors() {
  const [index, setIndex] = useState(0);
  const [copied, setCopied] = useState(false);
  const color = COLORS[index];
  const hex = toHex(color);
  const cycle = () => setIndex((i) => (i + 1) % COLORS.length);
  const handleCopy = useCallback(() => {
    copyToClipboard(hex);
    setCopied(true);
    setTimeout(() => setCopied(false), 1000);
  }, [hex]);
  return (
    <ListBox>
      <BorderBox>
        <ListBox>
          <InfoBox>{color.name}</InfoBox>
          <CardBox
            style={{ backgroundColor: `rgb(${color.r},${color.g},${color.b})`, cursor: "pointer" }}
            onClick={cycle}
          />
          <GridBox cols={2}>
            <InfoBox style={{ cursor: "pointer" }} onClick={handleCopy}>
              {copied ? "copied!" : hex}
            </InfoBox>
            <InfoBox>
              rgb({color.r}, {color.g}, {color.b})
            </InfoBox>
          </GridBox>
        </ListBox>
      </BorderBox>
      <BorderBox>
        <GridBox cols={3}>
          {COLORS.map((c, i) => (
            <CardBox
              key={c.name}
              onClick={() => setIndex(i)}
              className={i === index ? "outline" : ""}
              style={{
                backgroundColor: `rgb(${c.r},${c.g},${c.b})`,
                cursor: "pointer",
              }}
            />
          ))}
        </GridBox>
      </BorderBox>
      <BorderBox>
        <LinkBox>
          <a href="/colors.json" download style={{ color: "inherit", textDecoration: "none", display: "block" }}>
            json
          </a>
        </LinkBox>
      </BorderBox>
    </ListBox>
  );
}
