import { own } from "@mrlyprod/ui/kit/reader.tsx";
import { figures } from "@mrlyprod/ui/shell/figures.ts";
import type { Mounting } from "@mrlyprod/ui/shell/router.ts";
import { Widget } from "./widget.tsx";

export const { layout, render, mount, unmount } = own<Mounting>((_host, { rows, site }) => (
  <Widget rows={rows} site={site} draw={figures} />
));
