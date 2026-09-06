from catalog.helpers import load_product, save_product
from catalog.models import Variant
from typing import Tuple

STANDARD_SIZES = [
    "3XS", "2XS", "XS", "S", "S/M", "M", "M/L", "L", "L/XL", "XL",
    "2XL", "3XL", "4XL", "5XL", "6XL", "7XL"
]

SPECIAL_SIZES = [
    "One size"
]

KIDS_SIZES = [
    "2T", "3T", "4T", "5T", "6", "6X", "7", "8", "10", "12", "14"
]

SIZE_CATEGORIES = {
    "standard": set(STANDARD_SIZES),
    "special": set(SPECIAL_SIZES),
    "kids": set(KIDS_SIZES),
}

def clean_size(size: str) -> str:
    if not size:
        return ""
    size = size.replace("\u2033", "")
    size = size.replace("\u00d7", "x")
    size = size.replace(" ", "")
    return size

def parse_dimensional_size(size: str) -> Tuple[float, float]:
    if not size:
        return None
    try:
        cleaned = clean_size(size)
        if not cleaned:
            return None
        if "x" in cleaned.lower():
            width, height = cleaned.lower().split("x")
            return (float(width), float(height))
        value = float(cleaned)
        return (value, value)
    except ValueError:
        return None

def determine_size_type(variants: list[Variant]) -> str:
    variant_sizes = {v.size for v in variants if v.size}
    if not variant_sizes:
        return "unknown"
    if all(parse_dimensional_size(size) for size in variant_sizes):
        return "dimensional"
    for size_type, size_set in SIZE_CATEGORIES.items():
        if variant_sizes.issubset(size_set):
            return size_type
    print(f"No size array contains all sizes: {variant_sizes}")
    return "unknown"

def get_size_index(size: str, size_type: str) -> Tuple[int, float]:
    if not size:
        return (999, 0)
    match size_type:
        case "standard":
            if size in STANDARD_SIZES:
                return (100, STANDARD_SIZES.index(size))
        case "special":
            if size in SPECIAL_SIZES:
                return (200, SPECIAL_SIZES.index(size))
        case "kids":
            if size in KIDS_SIZES:
                return (300, KIDS_SIZES.index(size))
        case "dimensional":
            dimensional_size = parse_dimensional_size(size)
            if dimensional_size:
                width, height = dimensional_size
                return (400, width * height)
            return (999, 0)
    print(f"Unknown size type for {size}")
    return (999, 0)

def sort_products(ids: list[int]):
    print(f"Sorting {len(ids)} products")
    for id in ids:
        product = load_product(id)
        size_type = determine_size_type(product.variants)
        product.variants = sorted(
            product.variants,
            key=lambda v: (get_size_index(v.size, size_type))
        )
        print(f"Sorted: {product.desc} - {size_type.upper()}")
        save_product(product)
    print(f"Sorted {len(ids)} products")
