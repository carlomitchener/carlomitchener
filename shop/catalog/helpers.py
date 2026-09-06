import json
import os
from enum import Enum
from catalog.models import Product
from env import SHOP_DIR, load_json, save_json

ROOT = SHOP_DIR

CATALOG = os.path.join(ROOT, "files/catalog.json")
CORRECTIONS = os.path.join(ROOT, "files/corrections.json")

class Category(Enum):
    ACCESSORIES = "accessories"
    BAGS = "bags"
    KIDS = "kids"
    MEN = "men"
    UNISEX = "unisex"
    WOMEN = "women"

# CATALOG

def load_catalog() -> list[dict]:
    return load_json(CATALOG)

def load_corrections() -> dict:
    return load_json(CORRECTIONS)

def catalog_map() -> dict:
    return {row["id"]: row for row in load_catalog()}

def all_ids(category: Category = None) -> list[int]:
    rows = load_catalog()
    if category:
        rows = [r for r in rows if r["category"] == category.value]
    return [r["id"] for r in rows]

def live_ids() -> list[int]:
    return [r["id"] for r in load_catalog() if r.get("live")]

def sort_catalog():
    rows = load_catalog()
    ordered = sorted(rows, key=lambda r: (not r.get("live"), r["category"], r["title"]))
    if rows != ordered:
        save_json(CATALOG, ordered)
        print(f"Sorted {len(ordered)} catalog rows, live first")
    else:
        print("Catalog rows are already sorted, live first")

# PRODUCTS

def product_path(id: int) -> str:
    return os.path.join(ROOT, f"data/products/{id}.json")

def load_product(id: int) -> Product:
    return Product.from_dict(load_json(product_path(id)))

def save_product(product: Product):
    save_json(product_path(product.id), product.to_dict())

def print_product(id: int):
    print(json.dumps(load_json(product_path(id)), indent=2))
