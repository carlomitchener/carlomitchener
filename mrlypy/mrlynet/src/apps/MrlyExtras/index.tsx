import { useState } from "react";
import { useRouter, type View } from "../../router";
import { BorderBox, OutBox, ListBox, GridBox } from "../../components/System";
import { Cycle } from "../../components/Cycle";
import { MrlyProd } from "../../components/MrlyProd";

const donateLink = "https://donate.stripe.com/dRm3cu3XLfHj19e6WW5kk00";
const hashtags = ["mrlywear", "wearmrly", "mrlyshop", "shopmrly"];
const poweredBys = ["aws", "bob", "mrly", "printful", "shopify"];
const quotes = ["this is the way", "why is the secret"];
const legal = ["copyright © 2026 mrlyprod, inc.", "all rights reserved."];
const socialLinks = [
  { href: "https://instagram.com/mrlyprod", label: "instagram" },
  { href: "https://reddit.com/r/mrlyprod", label: "reddit" },
  { href: "https://twitter.com/mrlyprod", label: "twitter" },
];

// COMPONENT

export function MrlyExtras() {
  const { navigate } = useRouter();
  const [shuffledLinks] = useState(() => [...socialLinks].sort(() => Math.random() - 0.5));
  return (
    <ListBox>
      <BorderBox>
        <div
          className="grid-box"
          style={{ gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))" }}
        >
          {shuffledLinks.map((link) => (
            <OutBox key={link.label} href={link.href}>
              {link.label}
            </OutBox>
          ))}
        </div>
      </BorderBox>
      <BorderBox>
        <GridBox cols={2}>
          <OutBox href={donateLink}>donate</OutBox>
          <OutBox href="mailto:help@mrlyprod.com">help</OutBox>
        </GridBox>
      </BorderBox>
      <BorderBox>
        <ListBox>
          <Cycle items={hashtags} prefix="#" />
          <Cycle items={poweredBys} prefix="powered by " />
          <Cycle items={quotes} />
          <Cycle items={legal} />
        </ListBox>
      </BorderBox>
      <BorderBox>
        <div onClick={() => navigate("mation" as View)} style={{ cursor: "pointer" }}>
          <MrlyProd />
        </div>
      </BorderBox>
    </ListBox>
  );
}
