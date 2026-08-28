export type { AppConfig } from "../registry";
import type { AppConfig } from "../registry";

export type View = AppConfig["id"];

export interface ParsedRoute {
  view: View;
  subPath: string;
  search: string;
}
