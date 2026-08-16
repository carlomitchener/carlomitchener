import { useState, useEffect, useCallback, useMemo } from "react";
import { Skeleton } from "../../components/Skeleton";
import { ListBox, BorderBox, InfoBox } from "../../components/System";
import { useRouter } from "../../router";
import { useProducts } from "./useProducts";
import { CATEGORIES, CDN_BASE } from "./config";
import { SHOP_CATEGORIES } from "./categories";
import { Filter } from "./Filter";
import { Feed } from "./Feed";
import { Product } from "./Product";
import { CollectionsMenu } from "./CollectionsMenu";
import { CollectionView } from "./CollectionView";
import { PrintfulLinks } from "./PrintfulLinks";
import { ShopHeader } from "./ShopHeader";
import { CartView } from "./cart/CartView";
import type { Products, ProductTuple } from "./types";
import { P } from "./types";

// ROUTE TYPES

type ShopRoute =
  | { view: "feed"; tags: string | null }
  | { view: "collections" }
  | { view: "collection"; category: string | null }
  | { view: "cart" }
  | { view: "product"; handle: string };

const CATEGORY_SET = new Set(CATEGORIES.map((c) => c.toLowerCase()));

function parseShopRoute(subPath: string, search: string): ShopRoute {
  if (!subPath) {
    const params = new URLSearchParams(search);
    const tags = params.get("tags");
    return { view: "feed", tags };
  }
  if (subPath === "cart") return { view: "cart" };
  if (subPath === "collections") return { view: "collections" };
  if (subPath === "collections/all") return { view: "collection", category: null };
  if (subPath.startsWith("collections/")) {
    const slug = subPath.slice("collections/".length);
    if (CATEGORY_SET.has(slug.toLowerCase())) {
      const match = CATEGORIES.find((c) => c.toLowerCase() === slug.toLowerCase());
      return { view: "collection", category: match || null };
    }
    return { view: "feed", tags: null };
  }
  if (subPath.startsWith("products/")) {
    const handle = subPath.slice("products/".length);
    if (handle) return { view: "product", handle };
    return { view: "feed", tags: null };
  }
  return { view: "feed", tags: null };
}

// DATA

function useProductsJson() {
  const [products, setProducts] = useState<Products>({});
  useEffect(() => {
    fetch(`${CDN_BASE}/products.json`)
      .then((res) => res.json())
      .then(setProducts)
      .catch(() => setProducts({}));
  }, []);
  return products;
}

function getCategory(product: ProductTuple, products: Products): string | null {
  const entry = products[product[P.PRODUCT_TYPE]];
  if (!entry) return null;
  return entry.split(", ")[0];
}

// COMPONENT

export function MrlyShop() {
  const { subPath, search, navigate, navigateTo } = useRouter();
  const route = useMemo(() => parseShopRoute(subPath, search), [subPath, search]);
  const { products, loading, error } = useProducts();
  const productsJson = useProductsJson();

  // FEED FILTERING
  const filtered = useMemo(() => {
    if (route.view !== "feed") return products;
    if (!route.tags) return products;
    const tag = route.tags.toLowerCase();
    return products.filter((p) => getCategory(p, productsJson)?.toLowerCase() === tag);
  }, [products, route, productsJson]);

  const filterCategory = useMemo(() => {
    if (route.view !== "feed" || !route.tags) return null;
    const tag = route.tags.toLowerCase();
    const match = SHOP_CATEGORIES.find((c) => c.category && c.category.toLowerCase() === tag);
    return match?.category || null;
  }, [route]);

  // NAVIGATION HANDLERS
  const handleFeedSelect = useCallback(
    (index: number) => {
      const product = filtered[index];
      if (!product) return;
      navigateTo(`/shop/products/${product[P.HANDLE]}`);
    },
    [filtered, navigateTo]
  );

  const handleCollectionSelect = useCallback(
    (handle: string) => {
      navigateTo(`/shop/products/${handle}`);
    },
    [navigateTo]
  );

  const handleCategorySelect = useCallback(
    (category: string | null) => {
      if (category) {
        navigateTo(`/shop/collections/${category.toLowerCase()}`);
      } else {
        navigateTo("/shop/collections/all");
      }
    },
    [navigateTo]
  );

  const handleFilterChange = useCallback(
    (next: string | null) => {
      if (next) {
        navigateTo(`/shop?tags=${next.toLowerCase()}`);
      } else {
        navigateTo("/shop");
      }
    },
    [navigateTo]
  );

  const handleCartOpen = useCallback(() => {
    navigateTo("/shop/cart");
  }, [navigateTo]);

  // HEADER
  const header = (
    <ShopHeader
      leftIcon="+"
      leftActive={route.view === "collections"}
      homeActive={route.view === "feed"}
      cartActive={route.view === "cart"}
      onLeft={() => navigateTo("/shop/collections")}
      onHome={() => navigateTo("/shop")}
      onCart={handleCartOpen}
    />
  );

  // CONTENT
  const content = (() => {
    if (loading) return <Skeleton />;
    if (error) {
      return (
        <BorderBox>
          <InfoBox>{error}</InfoBox>
        </BorderBox>
      );
    }
    switch (route.view) {
      case "feed":
        return (
          <>
            <Filter category={filterCategory} count={filtered.length} onChange={handleFilterChange} />
            <Feed products={filtered} onSelect={handleFeedSelect} />
          </>
        );
      case "collections":
        return <CollectionsMenu onSelect={handleCategorySelect} />;
      case "collection":
        return (
          <CollectionView
            category={route.category}
            products={products}
            productsJson={productsJson}
            onSelect={handleCollectionSelect}
          />
        );
      case "cart":
        return <CartView onBack={() => navigateTo("/shop")} />;
      case "product": {
        const product = products.find((p) => p[P.HANDLE] === route.handle);
        if (!product) {
          navigate("home");
          return null;
        }
        const collection = products.filter((p) => p[P.PRODUCT_TYPE] === product[P.PRODUCT_TYPE]);
        const collectionStart = collection.findIndex((p) => p[P.ID] === product[P.ID]);
        return (
          <Product collection={collection} initialIndex={Math.max(0, collectionStart)} productsJson={productsJson} />
        );
      }
      default:
        navigate("home");
        return null;
    }
  })();

  return (
    <div>
      <ListBox>
        {header}
        {content}
        <PrintfulLinks />
      </ListBox>
    </div>
  );
}
