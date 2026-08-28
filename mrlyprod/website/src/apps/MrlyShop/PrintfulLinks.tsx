import { BorderBox, GridBox, InfoBox, ListBox, OutBox } from "../../components/System";

interface LinkItem {
  label: string;
  href: string;
}

const LINKS: LinkItem[] = [
  { label: "printful website", href: "https://www.printful.com" },
  { label: "shipping", href: "https://www.printful.com/shipping" },
  { label: "status", href: "https://www.printfulstatus.com" },
  { label: "help center", href: "https://help.printful.com" },
  { label: "recent updates", href: "https://www.printful.com/recent-updates" },
  { label: "sustainability", href: "https://www.printful.com/sustainability-responsibility" },
];

export function PrintfulLinks() {
  if (!LINKS.length) return null;

  return (
    <BorderBox>
      <ListBox>
        <InfoBox>printful links</InfoBox>
        <GridBox cols={2}>
          {LINKS.map((item, i) => (
            <OutBox key={i} href={item.href}>
              {item.label}
            </OutBox>
          ))}
        </GridBox>
      </ListBox>
    </BorderBox>
  );
}
