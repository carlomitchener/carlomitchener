import { hide, type Layout, type Row, type Site, show } from "../../shell.ts";

export const layout: Layout = { wide: true, bare: true, window: "none" };

export function render(_row: Row, site: Site, host: HTMLElement) {
  show(host, <h1 className="visually-hidden">{site.title}</h1>);
}

export const unmount = hide;
