import { hide, Launchpad, type Layout, opened, show } from "../../shell.ts";

export const layout: Layout = { wide: true, bare: true, window: "none" };

export function render(_row: unknown, _site: unknown, host: HTMLElement) {
  show(host, <Launchpad />);
}

export const mount = opened;

export const unmount = hide;
