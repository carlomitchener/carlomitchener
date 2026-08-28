import { useState, useEffect } from "react";
import { CACHE_TIME, CDN_BASE } from "./config";
import { getItem, setItem } from "../../lib/browser/storage";
import type { ProductTuple } from "./types";
import { P } from "./types";

interface CacheEntry {
  timestamp: number;
  data: ProductTuple[];
}

function shuffleImages(products: ProductTuple[]): void {
  for (const p of products) {
    const images = p[P.IMAGES];
    if (images && images.length > 1) {
      for (let i = images.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [images[i], images[j]] = [images[j], images[i]];
      }
    }
  }
}

function loadCache(): ProductTuple[] | null {
  try {
    const raw = getItem("mrly_cache");
    if (!raw) return null;
    const { timestamp, data } = JSON.parse(raw) as CacheEntry;
    if (Date.now() - timestamp < CACHE_TIME) {
      return data || null;
    }
  } catch {

  }
  return null;
}

function saveCache(data: ProductTuple[]): void {
  const entry: CacheEntry = { timestamp: Date.now(), data };
  setItem("mrly_cache", JSON.stringify(entry));
}

const DATA_URL = `${CDN_BASE}/data.json`;

async function fetchFromApi(): Promise<ProductTuple[]> {
  const response = await fetch(DATA_URL);
  if (!response.ok) throw new Error(`fetch failed: ${response.status}`);
  const json = await response.json();
  return json.data;
}

export function useProducts() {
  const [products, setProducts] = useState<ProductTuple[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const cached = loadCache();
        if (cached) {
          shuffleImages(cached);
          if (!cancelled) {
            setProducts(cached);
            setLoading(false);
          }
          return;
        }
        const data = await fetchFromApi();
        saveCache(data);
        shuffleImages(data);
        if (!cancelled) {
          setProducts(data);
          setLoading(false);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "unknown error");
          setLoading(false);
        }
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);
  return { products, loading, error };
}
