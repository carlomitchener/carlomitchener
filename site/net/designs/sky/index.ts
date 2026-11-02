import { glass } from "@mrlyprod/design-glass/index.ts";
import type { Design } from "@mrlyprod/shell/design.ts";
import { Bar } from "./bar.tsx";
import { DARK, LIGHT } from "./skin.ts";

/* SKY */

const GLASS = "@mrlyprod/design-glass";

export const sky = {
  ...glass,
  id: "sky",
  title: "Sky",
  skin: { light: LIGHT, dark: DARK },
  bar: { light: "#f7f9fc", dark: "#05070c" },
  css: [
    "tokens.css",
    ...["chrome.css", "desk.css", "appicons.css"].map((one) => `${GLASS}/${one}`),
    "saver.css",
    "sky.css",
  ],
  pulldown: `${GLASS}/pulldown.ts`,
  parts: { ...glass.parts, bar: Bar },
} satisfies Design;
