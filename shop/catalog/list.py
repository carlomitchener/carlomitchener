import argparse
from catalog.helpers import all_ids, live_ids, load_product
from catalog.models import Product
from typing import Any, Callable

def listattr(ids: list[int], title: str, extractor: Callable[[Product], Any]):
    values = set()
    for id in ids:
        product = load_product(id)
        extracted = extractor(product)
        if isinstance(extracted, list):
            values.update(extracted)
        elif isinstance(extracted, set):
            values.update(extracted)
        elif extracted is not None:
            values.add(extracted)
    print(f"Unique {title} ({len(values)}):")
    try:
        sorted_values = sorted(list(values))
    except TypeError:
        sorted_values = list(values)
    for item in sorted_values:
        print(f"\"{item}\",")
    print()

# PRODUCTS

def list_titles(ids: list[int]):
    listattr(ids, "Product Titles", lambda p: p.title)

def list_categories(ids: list[int]):
    listattr(ids, "Product Categories", lambda p: p.category)

def list_techniques(ids: list[int]):
    listattr(ids, "Product Techniques", lambda p: p.technique)

def list_stitch_colors(ids: list[int]):
    listattr(ids, "Stitch Colors", lambda p: p.stitch_colors)

# VARIANTS

def list_sizes(ids: list[int]):
    def extractor(p: Product):
        return {v.size for v in p.variants}
    listattr(ids, "Variant Sizes", extractor)

def list_colors(ids: list[int]):
    def extractor(p: Product):
        return {v.color for v in p.variants}
    listattr(ids, "Variant Colors", extractor)

def list_costs(ids: list[int]):
    def extractor(p: Product):
        return {v.cost for v in p.variants}
    listattr(ids, "Variant Costs", extractor)

# PLACEMENTS

def list_placements(ids: list[int]):
    def extractor(p: Product):
        return {placement.name for placement in p.placements if not placement.is_ignored}
    listattr(ids, "Placement Names", extractor)

def list_dimensions(ids: list[int]):
    def extractor(p: Product):
        return {placement.dims for placement in p.placements if not placement.is_ignored}
    listattr(ids, "Placement Dimensions", extractor)

def list_dpis(ids: list[int]):
    def extractor(p: Product):
        return {placement.dpi for placement in p.placements if not placement.is_ignored}
    listattr(ids, "Placement DPIs", extractor)

def list_ids(ids: list[int]):
    def extractor(p: Product):
        return {placement.id for placement in p.placements if not placement.is_ignored}
    listattr(ids, "Placement IDs", extractor)

# MOCKUPS

def list_mockup_categories(ids: list[int]):
    def extractor(p: Product):
        return {m.category for m in p.mockups if not m.is_ignored}
    listattr(ids, "Mockup Categories", extractor)

def list_mockup_titles(ids: list[int]):
    def extractor(p: Product):
        return {m.title for m in p.mockups if not m.is_ignored}
    listattr(ids, "Mockup Titles", extractor)

# EXTRAS

def list_variants(ids: list[int]):
    print(f"Listing variants for {len(ids)} products")
    for id in ids:
        product = load_product(id)
        print(f"{product.desc} - {len(product.variants)}")
        for i, variant in enumerate(product.variants):
            print(f"({i+1}) {variant.size} / {variant.color}")
        print()

# AVERAGES

def average_variants(ids: list[int]):
    average = sum(len(load_product(id).variants) for id in ids) / len(ids)
    print(f"Average variants per product: {average:.2f}")

def average_costs(ids: list[int]):
    total_cost = 0
    variant_count = 0
    for id in ids:
        product = load_product(id)
        for variant in product.variants:
            total_cost += float(variant.cost)
            variant_count += 1
    average = total_cost / variant_count
    print(f"Average cost per variant: ${average:.2f}")

def average_placements(ids: list[int]):
    average = sum(len(load_product(id).placements) for id in ids) / len(ids)
    print(f"Average placements per product: {average:.2f}")

def average_mockups(ids: list[int]):
    average = sum(len(load_product(id).mockups) for id in ids) / len(ids)
    print(f"Average mockups per product: {average:.2f}")

# COMMANDS

GROUPS = {
    "products": [list_titles, list_categories, list_techniques, list_stitch_colors],
    "variants": [list_sizes, list_colors, list_costs],
    "placements": [list_placements, list_dimensions, list_dpis, list_ids],
    "mockups": [list_mockup_categories, list_mockup_titles],
    "extras": [list_variants],
    "averages": [average_variants, average_costs, average_placements, average_mockups],
}

def run(groups: list[str], ids: list[int]):
    for group in groups:
        for fn in GROUPS[group]:
            fn(ids)

def main():
    p = argparse.ArgumentParser(prog="catalog.list")
    p.add_argument("group", nargs="?", default="all", choices=["all"] + list(GROUPS))
    p.add_argument("--all", action="store_true")
    p.add_argument("--id", type=int, nargs="+")
    args = p.parse_args()
    ids = args.id or (all_ids() if args.all else live_ids())
    groups = list(GROUPS) if args.group == "all" else [args.group]
    print(f"Listing {groups} for {len(ids)} products")
    run(groups, ids)

if __name__ == "__main__":
    main()
