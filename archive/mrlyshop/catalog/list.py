import time
from helpers import all_ids
from helpers import Category
from helpers import load_product
from models import Product

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

def list_prices(ids: list[int]):
    def extractor(p: Product):
        return {v.price for v in p.variants}
    listattr(ids, "Variant Prices", extractor)

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

def average_prices(ids: list[int]):
    total_price = 0
    variant_count = 0
    for id in ids:
        product = load_product(id)
        for variant in product.variants:
            total_price += float(variant.price)
            variant_count += 1
    average = total_price / variant_count
    print(f"Average price per variant: ${average:.2f}")

def average_placements(ids: list[int]):
    average = sum(len(load_product(id).placements) for id in ids) / len(ids)
    print(f"Average placements per product: {average:.2f}")

def average_mockups(ids: list[int]):
    average = sum(len(load_product(id).mockups) for id in ids) / len(ids)
    print(f"Average mockups per product: {average:.2f}")

# COMMANDS

def cmd_products():
    ids = all_ids()
    list_titles(ids)
    list_categories(ids)
    list_techniques(ids)
    list_stitch_colors(ids)

def cmd_variants():
    ids = all_ids()
    list_sizes(ids)
    list_colors(ids)
    list_prices(ids)

def cmd_placements():
    ids = all_ids()
    list_placements(ids)
    list_dimensions(ids)
    list_dpis(ids)
    list_ids(ids)

def cmd_mockups():
    ids = all_ids()
    list_mockup_categories(ids)
    list_mockup_titles(ids)

def cmd_extras():
    ids = all_ids()
    list_variants(ids)

def cmd_averages():
    ids = all_ids()
    average_variants(ids)
    average_prices(ids)
    average_placements(ids)
    average_mockups(ids)

def cmd_all():
    ids = all_ids()
    list_titles(ids)
    list_categories(ids)
    list_techniques(ids)
    list_stitch_colors(ids)
    list_sizes(ids)
    list_colors(ids)
    list_prices(ids)
    list_placements(ids)
    list_dimensions(ids)
    list_dpis(ids)
    list_ids(ids)
    list_mockup_categories(ids)
    list_mockup_titles(ids)
    list_variants(ids)
    average_variants(ids)
    average_prices(ids)
    average_placements(ids)
    average_mockups(ids)

if __name__ == "__main__":
    pass
