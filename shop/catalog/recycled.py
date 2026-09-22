from fetch import raw_path
from helpers import all_ids, catalog_map, load_json

def is_recycled(product_data: dict) -> bool:
    return "recycled" in product_data["data"]["description"].lower()

def report(ids: list[int]) -> None:
    rows = catalog_map()
    found = []
    for id in ids:
        product_data = load_json(raw_path("products", id))
        if not is_recycled(product_data):
            continue
        name = product_data["data"]["name"]
        silent = "recycled" not in name.lower()
        found.append(silent)
        print(f"Recycled: {id} - {rows[id]['title']}{' - not in the Printful name' if silent else ''}")
    print(f"Recycled {len(found)} of {len(ids)} products, {sum(found)} without the word in the Printful name")

if __name__ == "__main__":
    report(all_ids())
