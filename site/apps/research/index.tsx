import { own } from "mrly-kit/reader.tsx";
import { figures } from "mrly-shell/figures.ts";
import type { Mounting } from "mrly-shell/router.ts";
import { Widget } from "./widget.tsx";

export const { layout, render, mount, unmount } = own<Mounting>((_host, { rows, site }) => (
  <Widget rows={rows} site={site} draw={figures} />
));
