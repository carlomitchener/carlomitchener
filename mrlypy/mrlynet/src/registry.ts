import { lazy, type ComponentType } from "react";
import { MrlyShop } from "./apps/MrlyShop";
import data from "./apps.json";

// TYPES

export interface AppConfig {
  id: string;
  emoji: string;
  title: string;
  description: string;
  category: string;
  fullscreen?: boolean;
  hidden?: boolean;
}

// APPS

export const APPS: readonly AppConfig[] = data.apps;

// COMPONENTS

const modules = import.meta.glob(["./apps/*/index.tsx", "!./apps/MrlyShop/index.tsx"]);

export const APP_COMPONENTS: Record<string, ComponentType<any>> = {
  MrlyShop,
};

for (const [path, loader] of Object.entries(modules)) {
  const name = path.match(/\.\/apps\/(\w+)\//)?.[1];
  if (name && !(name in APP_COMPONENTS)) {
    APP_COMPONENTS[name] = lazy(() =>
      (loader() as Promise<Record<string, ComponentType>>).then((m) => ({ default: m[name] }))
    );
  }
}

// HELPERS

export function isFullscreen(id: string): boolean {
  const app = APPS.find((a) => a.id === id);
  return app?.fullscreen === true;
}

export function getTitle(id: string): string {
  const app = APPS.find((a) => a.id === id);
  return app?.title ?? id;
}

export function getDescription(id: string): string {
  const app = APPS.find((a) => a.id === id);
  return app?.description ?? "";
}

export function getComponentName(id: string): string {
  return `Mrly${id.charAt(0).toUpperCase()}${id.slice(1)}`;
}
