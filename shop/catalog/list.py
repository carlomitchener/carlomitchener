from helpers import all_ids, load_product
from models import Product
from typing import Any, Callable

def listattr(ids: list[int], title: str, extractor: Callable[[Product], Any]):
    values = set()
    for id in ids:
        product = load_product(id)
        extracted = extractor(product)
        if isinstance(extracted, (list, set)):
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
    listattr(ids, "Variant Sizes", lambda p: {v.size for v in p.variants})

def list_colors(ids: list[int]):
    listattr(ids, "Variant Colors", lambda p: {v.color for v in p.variants})

def list_costs(ids: list[int]):
    listattr(ids, "Variant Costs", lambda p: {v.cost for v in p.variants})

# PLACEMENTS

def live_placements(p: Product):
    return [x for x in p.placements if not x.is_ignored]

def list_placements(ids: list[int]):
    listattr(ids, "Placement Names", lambda p: {x.name for x in live_placements(p)})

def list_dimensions(ids: list[int]):
    listattr(ids, "Placement Dimensions", lambda p: {x.dims for x in live_placements(p)})

def list_dpis(ids: list[int]):
    listattr(ids, "Placement DPIs", lambda p: {x.dpi for x in live_placements(p)})

def list_ids(ids: list[int]):
    listattr(ids, "Placement IDs", lambda p: {x.id for x in live_placements(p)})

# MOCKUPS

def live_mockups(p: Product):
    return [m for m in p.mockups if not m.is_ignored]

def list_mockup_categories(ids: list[int]):
    listattr(ids, "Mockup Categories", lambda p: {m.category for m in live_mockups(p)})

def list_mockup_titles(ids: list[int]):
    listattr(ids, "Mockup Titles", lambda p: {m.title for m in live_mockups(p)})

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
    costs = [float(v.cost) for id in ids for v in load_product(id).variants]
    print(f"Average cost per variant: ${sum(costs) / len(costs):.2f}")

def average_placements(ids: list[int]):
    average = sum(len(load_product(id).placements) for id in ids) / len(ids)
    print(f"Average placements per product: {average:.2f}")

def average_mockups(ids: list[int]):
    average = sum(len(load_product(id).mockups) for id in ids) / len(ids)
    print(f"Average mockups per product: {average:.2f}")

if __name__ == "__main__":
    ids = all_ids()
    list_titles(ids)
    list_categories(ids)
    list_techniques(ids)
    list_stitch_colors(ids)
    list_sizes(ids)
    list_colors(ids)
    list_costs(ids)
    list_placements(ids)
    list_dimensions(ids)
    list_dpis(ids)
    list_ids(ids)
    list_mockup_categories(ids)
    list_mockup_titles(ids)
    list_variants(ids)
    average_variants(ids)
    average_costs(ids)
    average_placements(ids)
    average_mockups(ids)
