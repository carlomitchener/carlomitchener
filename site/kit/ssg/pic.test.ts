import { describe, expect, test } from "bun:test";
import { themed } from "./pic.ts";

describe("pic", () => {
  test("a pair is one picture: the dark webp in the source, the light webp in the img", () => {
    expect(themed({ dark: "/figures/spin-dark.webp", light: "/figures/spin-light.webp" }, "Spin", "avatar", " loading=\"lazy\"")).toBe(
      '<picture><source data-dark srcset="/figures/spin-dark.webp" media="screen and (prefers-color-scheme: dark)" type="image/webp">' +
        '<img class="avatar" src="/figures/spin-light.webp" alt="Spin" width="1024" height="1024" loading="lazy"></picture>',
    );
  });
});
