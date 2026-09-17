import json
import os
from config import CATALOG, DICTIONARY, PRODUCTS
from enum import Enum
from env import load_json, save_json
from models import Product

class Category(Enum):
    ACCESSORIES = "accessories"
    BAGS = "bags"
    KIDS = "kids"
    MEN = "men"
    UNISEX = "unisex"
    WOMEN = "women"
    YOUTH = "youth"

# CATALOG

def load_catalog() -> list[dict]:
    return load_json(CATALOG)

def catalog_map() -> dict:
    return {row["id"]: row for row in load_catalog()}

def all_ids(category: Category = None) -> list[int]:
    rows = load_catalog()
    if category:
        rows = [r for r in rows if r["category"] == category.value]
    return [r["id"] for r in rows]

def sort_catalog():
    rows = load_catalog()
    ordered = sorted(rows, key=lambda r: (r["category"], r["title"]))
    if rows != ordered:
        save_json(CATALOG, ordered)
        print(f"Sorted {len(ordered)} products alphabetically")
    else:
        print("Products are already sorted alphabetically")

def create_dictionary():
    rows = load_catalog()
    dictionary = {r["id"]: f"{r['category']}, {r['title']}, {r['technique']}" for r in rows}
    save_json(DICTIONARY, dictionary)
    print(f"Created dictionary with {len(dictionary)} products")

# PRODUCTS

def product_path(id: int) -> str:
    return os.path.join(PRODUCTS, f"{id}.json")

def load_product(id: int) -> Product:
    return Product.from_dict(load_json(product_path(id)))

def save_product(product: Product):
    save_json(product_path(product.id), product.to_dict())

def print_product(id: int):
    print(json.dumps(load_json(product_path(id)), indent=2))

if __name__ == "__main__":
    sort_catalog()
    create_dictionary()
