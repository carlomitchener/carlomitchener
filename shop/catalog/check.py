from fetch import load_raw_catalog
from helpers import all_ids, load_catalog, load_product

def check_catalog(catalog: dict) -> list[str]:
    failures = []
    for row in load_catalog():
        id, title = row["id"], row["title"]
        if id not in catalog:
            failures.append(f"{id} - {title}: missing from the Printful catalog")
        elif not catalog[id].endswith(f" - {row['technique']}"):
            failures.append(f"{id} - {title}: {catalog[id]}")
    return failures

def check_products(ids: list[int]) -> list[str]:
    failures = []
    for id in ids:
        product = load_product(id)
        colors = {v.color for v in product.variants if not v.is_ignored}
        if len(colors) != 1:
            failures.append(f"{product.desc}: {len(colors)} colors {sorted(colors)}")
        if not [p for p in product.placements if not p.is_ignored]:
            failures.append(f"{product.desc}: no placement")
        if not [m for m in product.mockups if not m.is_ignored]:
            failures.append(f"{product.desc}: no mockup")
    return failures

def report(title: str, failures: list[str]) -> None:
    if not failures:
        print(f"Passed: {title}")
        return
    print(f"Failed: {title}")
    for line in failures:
        print(f"- {line}")
    raise SystemExit(1)

if __name__ == "__main__":
    ids = all_ids()
    report("catalog", check_catalog(load_raw_catalog()))
    report("products", check_products(ids))
