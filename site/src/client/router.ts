import { createContext, startTransition, useCallback, useContext, useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { bump } from "../lib/hooks.ts";
import { need } from "../kinds.js";
import site from "../../site.json";

export type View = { page: { kind: string; title: string; props: Record<string, unknown> }; chrome: { route: string; catalog: unknown[]; fly: boolean; now: number } };

export type Go = (href: string, options?: { keep?: boolean }) => void;

export const Nav = createContext<Go>(() => {});

export const useNav = () => useContext(Nav);

const heading = (title: string) => (title === site.name ? site.name : `${title} · ${site.name}`);

function target(event: MouseEvent | FocusEvent | PointerEvent): { link: HTMLAnchorElement; url: URL } | null {
  const node = event.target instanceof Element ? event.target.closest("a[href]") : null;
  if (!(node instanceof HTMLAnchorElement)) return null;
  if (node.target || node.hasAttribute("download") || node.hasAttribute("data-buy")) return null;
  const url = new URL(node.href, location.href);
  if (url.origin !== location.origin || !url.pathname.endsWith("/")) return null;
  return { link: node, url };
}

const plain = (event: MouseEvent) => !event.defaultPrevented && event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey;

export function useRouter(first: View): [View, Go] {
  const [view, setView] = useState(first);
  const store = useRef<Map<string, View> | null>(null);
  if (!store.current) store.current = new Map([[first.chrome.route, first]]);
  const seen = store.current;
  const here = useRef(first.chrome.route);
  here.current = view.chrome.route;

  const grab = useCallback(
    async (path: string) => {
      const hit = seen.get(path);
      if (hit) return hit;
      const reply = await fetch(`${path}props.json`, { headers: { accept: "application/json" } });
      if (!reply.ok) throw new Error(`props ${reply.status}`);
      const next = (await reply.json()) as View;
      await need(next.page.kind);
      seen.set(path, next);
      return next;
    },
    [seen],
  );

  const paint = useCallback((next: View, keep: boolean) => {
    const swap = () => {
      setView(next);
      document.title = heading(next.page.title);
      if (!keep) scrollTo({ top: 0, behavior: "instant" });
    };
    if (typeof document.startViewTransition === "function") document.startViewTransition(() => flushSync(swap));
    else startTransition(swap);
  }, []);

  const go = useCallback<Go>(
    (href, options = {}) => {
      const url = new URL(href, location.href);
      void grab(url.pathname)
        .then((next) => {
          history.pushState(null, "", url.pathname + url.search + url.hash);
          paint(next, Boolean(options.keep));
          bump();
        })
        .catch(() => location.assign(href));
    },
    [grab, paint],
  );

  useEffect(() => {
    const click = (event: MouseEvent) => {
      if (!plain(event)) return;
      const hit = target(event);
      if (!hit) return;
      if (hit.url.hash && hit.url.pathname === location.pathname && hit.url.search === location.search) return;
      event.preventDefault();
      go(hit.url.pathname + hit.url.search + hit.url.hash, { keep: hit.link.hasAttribute("data-stay") });
    };
    const hint = (event: PointerEvent | FocusEvent) => {
      const hit = target(event);
      if (hit) void grab(hit.url.pathname).catch(() => {});
    };
    const pop = () => {
      const path = location.pathname;
      if (path === here.current) return;
      void grab(path)
        .then((next) => paint(next, true))
        .catch(() => location.reload());
    };
    document.addEventListener("click", click);
    document.addEventListener("pointerenter", hint as EventListener, true);
    document.addEventListener("focus", hint as EventListener, true);
    addEventListener("popstate", pop);
    return () => {
      document.removeEventListener("click", click);
      document.removeEventListener("pointerenter", hint as EventListener, true);
      document.removeEventListener("focus", hint as EventListener, true);
      removeEventListener("popstate", pop);
    };
  }, [go, grab, paint]);

  return [view, go];
}
