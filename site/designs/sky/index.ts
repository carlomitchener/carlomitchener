import { modern } from "@mrlyprod/designs/modern/index.ts";
import type { Design } from "@mrlyprod/ui/shell/design.ts";
import { DARK, LIGHT } from "./skin.ts";

const MODERN = "@mrlyprod/designs/modern";

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
} satisfies Design;
