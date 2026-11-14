import { figures } from "mrly-os-shell/figures.ts";
import type { Mounting } from "mrly-os-shell/router.ts";
import { own } from "mrly-os-ui/reader.tsx";
import { Widget } from "./widget.tsx";

export const { layout, render, mount, unmount } = own<Mounting>((_host, { rows, site }) => (
  <Widget rows={rows} site={site} draw={figures} />
));
