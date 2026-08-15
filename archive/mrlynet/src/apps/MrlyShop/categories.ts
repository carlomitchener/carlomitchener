export const SHOP_CATEGORIES: { label: string; emoji: string; category: string | null }[] = [
  { label: "all", emoji: "💈", category: null },
  { label: "accessories", emoji: "🧢", category: "Accessories" },
  { label: "bags", emoji: "🎒", category: "Bags" },
  { label: "kids", emoji: "🧸", category: "Kids" },
  { label: "men", emoji: "👨", category: "Men" },
  { label: "unisex", emoji: "🦄", category: "Unisex" },
  { label: "women", emoji: "👩", category: "Women" },
  { label: "youth", emoji: "🛼", category: "Youth" },
];

export const CATEGORY_NAMES = SHOP_CATEGORIES.filter((c) => c.category).map((c) => c.category!);
