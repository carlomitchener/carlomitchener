import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import type { View, ParsedRoute } from "./types";
import data from "../apps.json";

interface RouterContextType {
  currentView: View;
  subPath: string;
  search: string;
  navigate: (view: View) => void;
  navigateTo: (path: string) => void;
  goBack: () => void;
}

const RouterContext = createContext<RouterContextType | null>(null);
const VALID_ROUTES = new Set(data.apps.map((app) => app.id));
const TITLES = Object.fromEntries(data.apps.map((a) => [a.id, a.title]));
const DESCRIPTIONS = Object.fromEntries(data.apps.map((a) => [a.id, a.description]));

function isValidRoute(route: string): route is View {
  return VALID_ROUTES.has(route as View);
}

function parseLocation(pathname: string, search: string): ParsedRoute {
  const segments = pathname.replace(/^\//, "").toLowerCase().split("/").filter(Boolean);
  const firstSegment = segments[0] || "home";

  if (!isValidRoute(firstSegment)) {
    return { view: "home", subPath: "", search: "" };
  }

  return {
    view: firstSegment as View,
    subPath: segments.slice(1).join("/"),
    search,
  };
}

function buildPath(view: View, subPath?: string, search?: string): string {
  let path = view === "home" ? "/" : `/${view}`;
  if (subPath) path += `/${subPath}`;
  if (search) path += search;
  return path;
}

function buildTitle(view: View): string {
  if (view === "home") return "MrlyProd";
  const title = TITLES[view] ?? view;
  return `Mrly${title}`;
}

interface RouterProviderProps {
  children: ReactNode;
}

export function RouterProvider({ children }: RouterProviderProps) {
  const [route, setRoute] = useState<ParsedRoute>(() =>
    parseLocation(window.location.pathname, window.location.search)
  );

  useEffect(() => {
    document.title = buildTitle(route.view);
    const desc = DESCRIPTIONS[route.view] ?? "";
    if (desc) document.querySelector('meta[name="description"]')?.setAttribute("content", desc);
    const url = `https://mrly.net${buildPath(route.view, route.subPath)}`;
    document.querySelector('meta[property="og:url"]')?.setAttribute("content", url);
  }, [route.view, route.subPath]);

  useEffect(() => {
    const handlePopState = () => {
      setRoute(parseLocation(window.location.pathname, window.location.search));
      window.scrollTo(0, 0);
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const navigate = useCallback((view: View) => {
    const path = buildPath(view);
    window.history.pushState({ view }, "", path);
    setRoute({ view, subPath: "", search: "" });
    window.scrollTo(0, 0);
  }, []);

  const navigateTo = useCallback((fullPath: string) => {
    const url = new URL(fullPath, window.location.origin);
    const parsed = parseLocation(url.pathname, url.search);
    window.history.pushState({ view: parsed.view }, "", fullPath);
    setRoute(parsed);
    window.scrollTo(0, 0);
  }, []);

  const goBack = useCallback(() => {
    window.history.back();
  }, []);

  return (
    <RouterContext.Provider
      value={{
        currentView: route.view,
        subPath: route.subPath,
        search: route.search,
        navigate,
        navigateTo,
        goBack,
      }}
    >
      {children}
    </RouterContext.Provider>
  );
}

export function useRouter() {
  const context = useContext(RouterContext);
  if (!context) throw new Error("useRouter must be used within a RouterProvider");
  return context;
}
