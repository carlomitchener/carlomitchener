import { type Context, hide, type Layout, Lost, type Row, type Site, show } from "../../shell.ts";

export const layout: Layout = { bare: true };

export function render(row: Row, site: Site, host: HTMLElement, { rows }: Context) {
  show(host, <Lost row={row} site={site} rows={rows} />);
}

export const unmount = hide;
