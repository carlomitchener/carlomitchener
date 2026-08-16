import json
import os
from enum import Enum
from models import Product
from mrlycloud.helpers import load_json, save_json

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

class Category(Enum):
    ACCESSORIES = "Accessories"
    BAGS = "Bags"
    KIDS = "Kids"
    MEN = "Men"
    UNISEX = "Unisex"
    WOMEN = "Women"
    YOUTH = "Youth"

def load_product(id: int) -> Product:
    data = load_json(os.path.join(ROOT, f"data/products/{id}.json"))
    return Product.from_dict(data)

def save_product(product: Product):
    filepath = os.path.join(ROOT, f"data/products/{product.id}.json")
    save_json(filepath, product.to_dict())

def print_product(id: int):
    product = load_json(os.path.join(ROOT, f"data/products/{id}.json"))
    print(json.dumps(product, indent=2))

def all_ids(category: Category = None) -> list[int]:
    products = load_json(os.path.join(ROOT, "files/catalog.json"))
    if category:
        products = [p for p in products if p["category"] == category.value]
    return [product["id"] for product in products]

def sort_products():
    products = load_json(os.path.join(ROOT, "files/catalog.json"))
    sorted_products = sorted(products, key=lambda x: (x["category"], x["title"]))
    if products != sorted_products:
        save_json(os.path.join(ROOT, "files/catalog.json"), sorted_products)
        print(f"Sorted {len(sorted_products)} products alphabetically")
    else:
        print("Products are already sorted alphabetically")

def create_dictionary():
    products = load_json(os.path.join(ROOT, "files/catalog.json"))
    dictionary = {}
    for product in products:
        category = product["category"]
        title = product["title"]
        dictionary[product["id"]] = f"{category}, {title}"
    save_json(os.path.join(ROOT, "files/dictionary.json"), dictionary)
    print(f"Created dictionary with {len(dictionary)} products")

if __name__ == "__main__":
    create_dictionary()
