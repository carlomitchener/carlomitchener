import json
import os
import time
from config import DELAY, PRINTFUL_API_KEY, PRINTFUL_URL, RAW
from helpers import all_ids, load_json, save_json
from urllib.request import Request, urlopen

HEADERS = {"Authorization": f"Bearer {PRINTFUL_API_KEY}"}

def raw_path(kind: str, id: int = None) -> str:
    if id is None:
        return os.path.join(RAW, f"{kind}.json")
    return os.path.join(RAW, kind, f"{id}.json")

def get(url: str) -> dict:
    with urlopen(Request(url, headers=HEADERS), timeout=30) as response:
        data = json.loads(response.read())
    time.sleep(DELAY)
    return data

def get_pages(url: str) -> list[dict]:
    data = get(url)
    rows = list(data["data"])
    while "next" in data.get("_links", {}):
        data = get(data["_links"]["next"]["href"])
        rows.extend(data["data"])
    return rows

# CATALOG

def fetch_catalog() -> dict:
    print("Fetching the Printful catalog")
    rows = get_pages(f"{PRINTFUL_URL}/v2/catalog-products?limit=100")
    catalog = {}
    for row in sorted(rows, key=lambda r: r["id"]):
        if row["is_discontinued"]:
            continue
        name = row["name"].replace("’", "'")
        technique = "/".join(sorted(t["key"] for t in row["techniques"]))
        catalog[row["id"]] = f"{name} - {technique}"
    save_json(raw_path("catalog"), catalog)
    print(f"Fetched {len(catalog)} catalog titles")
    save_stats(catalog)
    return catalog

def save_stats(catalog: dict) -> None:
    counts = {}
    for title in catalog.values():
        technique = title.rsplit(" - ", 1)[1]
        counts[technique] = counts.get(technique, 0) + 1
    stats = dict(sorted(counts.items(), key=lambda item: -item[1]))
    save_json(raw_path("stats"), stats)
    print(f"Stamped {len(stats)} techniques into stats.json")

def load_raw_catalog(refetch: bool = False) -> dict:
    path = raw_path("catalog")
    if refetch or not os.path.exists(path):
        return fetch_catalog()
    catalog = {int(id): title for id, title in load_json(path).items()}
    print(f"Reusing {len(catalog)} catalog titles from {path}")
    return catalog

def new_products(refetch: bool = False):
    known = set(all_ids())
    catalog = load_raw_catalog(refetch)
    print("All-Over Print products missing from catalog.json:")
    for id, title in catalog.items():
        if id in known or not title.endswith(" - cut-sew"):
            continue
        if "All-Over Print" in title:
            print(f"{id} - {title}")

# PRODUCTS

def fetch_product(id: int) -> None:
    base = f"{PRINTFUL_URL}/v2/catalog-products/{id}"
    save_json(raw_path("products", id), get(base))
    variants = get_pages(f"{base}/catalog-variants?limit=100")
    save_json(raw_path("variants", id), {"data": variants})
    prices = get(f"{base}/prices?limit=100")
    page = prices
    while "next" in page.get("_links", {}):
        page = get(page["_links"]["next"]["href"])
        prices["data"]["variants"].extend(page["data"]["variants"])
    save_json(raw_path("prices", id), prices)
    save_json(raw_path("mockups", id), get(f"{base}/mockup-styles?limit=100"))

def has_raw(id: int) -> bool:
    kinds = ["products", "variants", "prices", "mockups"]
    return all(os.path.exists(raw_path(kind, id)) for kind in kinds)

def fetch_products(ids: list[int], refetch: bool = False) -> None:
    print(f"Fetching {len(ids)} products")
    for id in ids:
        if not refetch and has_raw(id):
            print(f"Reusing: {id}")
            continue
        fetch_product(id)
        print(f"Fetched: {id}")
    print(f"Fetched {len(ids)} products")

if __name__ == "__main__":
    ids = all_ids()
    fetch_products(ids)
    new_products()
    save_stats(load_raw_catalog())
