from correct import (
    correct_dimensions,
    correct_mockups,
    correct_placements,
    correct_variants
)
from helpers import all_ids
from parse import parse_products
from sort import sort_products

def main(ids: list[int]):
    print(f"Processing {len(ids)} products")
    parse_products(ids)
    sort_products(ids)
    correct_dimensions()
    correct_mockups()
    correct_placements()
    correct_variants()
    print("Done")

if __name__ == "__main__":
    ids = all_ids()
    main(ids)
