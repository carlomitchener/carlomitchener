import { useCallback, useSyncExternalStore } from "react";
import { get as getMode, none, subscribe as onMode } from "../client/mode.ts";
import type { Primary } from "./shop.ts";

/* NOW */

const ticks = new Set<() => void>();

let now = 0;

let timer: ReturnType<typeof setInterval> | null = null;

function beat() {
  now = Date.now();
  for (const fn of ticks) fn();
}

function run() {
  if (timer) clearInterval(timer);
  timer = null;
  if (document.hidden || !ticks.size) return;
  beat();
  timer = setInterval(beat, 1000);
}

function onTick(fn: () => void) {
  ticks.add(fn);
  if (ticks.size === 1) {
    document.addEventListener("visibilitychange", run);
    run();
  }
  return () => {
    ticks.delete(fn);
    if (ticks.size) return;
    document.removeEventListener("visibilitychange", run);
    run();
  };
}

const nowSnapshot = () => now;

const nowServer = () => 0;

export function useNow(initial: number) {
  return useSyncExternalStore(onTick, nowSnapshot, nowServer) || initial;
}

/* MEDIA */

export function useMediaQuery(query: string) {
  const subscribe = useCallback(
    (fn: () => void) => {
      const media = matchMedia(query);
      media.addEventListener("change", fn);
      return () => media.removeEventListener("change", fn);
    },
    [query],
  );
  return useSyncExternalStore(
    subscribe,
    useCallback(() => matchMedia(query).matches, [query]),
    () => false,
  );
}

/* SEARCH */

const NAV = "cm:nav";

export const bump = () => dispatchEvent(new Event(NAV));

function onNav(fn: () => void) {
  addEventListener("popstate", fn);
  addEventListener(NAV, fn);
  return () => {
    removeEventListener("popstate", fn);
    removeEventListener(NAV, fn);
  };
}

const searchSnapshot = () => location.search;

const searchServer = () => "";

export const useSearch = () => useSyncExternalStore(onNav, searchSnapshot, searchServer);

/* PRIMARY */

const pickers = new Set<() => void>();

let picked: Primary | null = null;

export function pickPrimary(next: Primary) {
  picked = next;
  for (const fn of pickers) fn();
}

function onPick(fn: () => void) {
  pickers.add(fn);
  return () => void pickers.delete(fn);
}

const pickedSnapshot = () => picked;

export function usePrimary(initial: Primary): Primary {
  const chosen = useSyncExternalStore(onPick, pickedSnapshot, none);
  const mode = useSyncExternalStore(onMode, getMode, none);
  return chosen ?? mode ?? initial;
}
