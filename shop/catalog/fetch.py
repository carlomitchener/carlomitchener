import json
import os
import time
from catalog.config import DELAY, PRINTFUL_API_KEY, PRINTFUL_URL
from catalog.helpers import ROOT
from env import load_json, save_json
from urllib.request import Request, urlopen

HEADERS = {"Authorization": f"Bearer {PRINTFUL_API_KEY}"}

RAW = os.path.join(ROOT, "data/raw")

def raw_path(kind: str, id: int = None) -> str:
    if id is None:
        return os.path.join(RAW, f"{kind}.json")
    return os.path.join(RAW, kind, f"{id}.json")

def get(url: str) -> dict:
    with urlopen(Request(url, headers=HEADERS), timeout=30) as response:
        return json.loads(response.read())

def get_paged(url: str, key: str = None) -> dict:
    data = get(url)
    rows = data["data"] if key is None else data["data"][key]
    while "next" in data.get("_links", {}):
        time.sleep(DELAY)
        data = get(data["_links"]["next"]["href"])
        rows.extend(data["data"] if key is None else data["data"][key])
    if key is None:
        data["data"] = rows
    else:
        data["data"][key] = rows
    return data

# CATALOG

def fetch_catalog() -> list[dict]:
    print("Fetching the Printful catalog")
    data = get_paged(f"{PRINTFUL_URL}/v2/catalog-products?limit=100")
    rows = data["data"]
    save_json(raw_path("catalog"), rows)
    print(f"Fetched {len(rows)} catalog rows")
    return rows

def load_raw_catalog(refetch: bool = False) -> list[dict]:
    path = raw_path("catalog")
    if refetch or not os.path.exists(path):
        return fetch_catalog()
    rows = load_json(path)
    print(f"Reusing {len(rows)} catalog rows from data/raw/catalog.json")
    return rows

# PRODUCTS

def fetch_one(kind: str, url: str, id: int, paged: bool, key: str = None) -> None:
    data = get_paged(url, key) if paged else get(url)
    save_json(raw_path(kind, id), data)
    print(f"Fetched {kind} for product {id}")
    time.sleep(DELAY)

def fetch_product(id: int) -> None:
    base = f"{PRINTFUL_URL}/v2/catalog-products/{id}"
    fetch_one("products", base, id, False)
    fetch_one("variants", f"{base}/catalog-variants?limit=100", id, True)
    fetch_one("prices", f"{base}/prices?limit=100", id, True, "variants")
    fetch_one("mockups", f"{base}/mockup-styles?limit=100", id, False)

def has_raw(id: int) -> bool:
    kinds = ["products", "variants", "prices", "mockups"]
    return all(os.path.exists(raw_path(kind, id)) for kind in kinds)

def fetch_products(ids: list[int], refetch: bool = False) -> None:
    print(f"Fetching product data for {len(ids)} products")
    for id in ids:
        if not refetch and has_raw(id):
            print(f"Reusing raw data for product {id}")
            continue
        fetch_product(id)
    print(f"Fetched product data for {len(ids)} products")
