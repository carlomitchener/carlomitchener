import os
from mrlycloud import requests
import time
from config import PRINTFUL_API_KEY, PRINTFUL_URL
from helpers import all_ids, save_json, ROOT

DELAY = 0.5

HEADERS = {"Authorization": f"Bearer {PRINTFUL_API_KEY}"}

def fetch_catalog() -> None:
    print("Fetching catalog")
    all_products = {}
    url = f"{PRINTFUL_URL}/v2/catalog-products?limit=100"
    while url:
        print(f"Fetching {url}")
        response = requests.get(url, headers=HEADERS)
        data = response.json()
        for product in data["data"]:
            all_products[product["id"]] = f"{product['name']} - {product['type']}"
        if "next" in data["_links"]:
            url = data["_links"]["next"]["href"]
            time.sleep(DELAY)
        else:
            url = None
    os.makedirs(os.path.join(ROOT, "data/raw"), exist_ok=True)
    save_json(os.path.join(ROOT, "data/raw/catalog.json"), all_products)
    print(f"Successfully saved {len(all_products)} products")

def fetch_products(ids: list[int]) -> None:
    print(f"Fetching product data for {len(ids)} products")
    for id in ids:
        url = f"{PRINTFUL_URL}/v2/catalog-products/{id}"
        response = requests.get(url, headers=HEADERS)
        data = response.json()
        os.makedirs(os.path.join(ROOT, "data/raw/products"), exist_ok=True)
        save_json(os.path.join(ROOT, f"data/raw/products/{id}.json"), data)
        print(f"Fetched product data for product {id}")
        time.sleep(DELAY)
    print(f"Fetched product data for {len(ids)} products")

def fetch_variants(ids: list[int]) -> None:
    print(f"Fetching variant data for {len(ids)} products")
    for id in ids:
        url = f"{PRINTFUL_URL}/v2/catalog-products/{id}/catalog-variants?limit=100"
        response = requests.get(url, headers=HEADERS)
        data = response.json()
        os.makedirs(os.path.join(ROOT, "data/raw/variants"), exist_ok=True)
        save_json(os.path.join(ROOT, f"data/raw/variants/{id}.json"), data)
        print(f"Fetched variant data for product {id}")
        time.sleep(DELAY)
    print(f"Fetched variant data for {len(ids)} products")

def fetch_prices(ids: list[int]) -> None:
    print(f"Fetching price data for {len(ids)} products")
    for id in ids:
        url = f"{PRINTFUL_URL}/v2/catalog-products/{id}/prices?limit=100"
        response = requests.get(url, headers=HEADERS)
        data = response.json()
        os.makedirs(os.path.join(ROOT, "data/raw/prices"), exist_ok=True)
        save_json(os.path.join(ROOT, f"data/raw/prices/{id}.json"), data)
        print(f"Fetched price data for product {id}")
        time.sleep(DELAY)
    print(f"Fetched price data for {len(ids)} products")

def fetch_mockups(ids: list[int]) -> None:
    print(f"Fetching mockup data for {len(ids)} products")
    for id in ids:
        url = f"{PRINTFUL_URL}/v2/catalog-products/{id}/mockup-styles?limit=100"
        response = requests.get(url, headers=HEADERS)
        data = response.json()
        os.makedirs(os.path.join(ROOT, "data/raw/mockups"), exist_ok=True)
        save_json(os.path.join(ROOT, f"data/raw/mockups/{id}.json"), data)
        print(f"Fetched mockup data for product {id}")
        time.sleep(DELAY)
    print(f"Fetched mockup data for {len(ids)} products")

def fetch_data(ids):
    fetch_products(ids)
    fetch_variants(ids)
    fetch_prices(ids)
    fetch_mockups(ids)
    print(f"Fectched data for {len(ids)} products")

if __name__ == "__main__":
    ids = all_ids()
    fetch_data(ids)
