import { modern } from "@mrlyprod/modern/index.ts";
import type { Design } from "@mrlyprod/shell/design.ts";
import { Bar } from "./bar.tsx";
import { DARK, LIGHT } from "./skin.ts";

const MODERN = "@mrlyprod/modern";

export const sky = {
  ...modern,
  id: "sky",
  title: "Sky",
  skin: { light: LIGHT, dark: DARK },
  bar: { light: "#f7f9fc", dark: "#05070c" },
  css: [
    "tokens.css",
    ...["chrome.css", "desk.css", "appicons.css"].map((one) => `${MODERN}/${one}`),
    "saver.css",
    "sky.css",
  ],
  pulldown: `${MODERN}/pulldown.ts`,
  parts: { ...modern.parts, bar: Bar },
} satisfies Design;
