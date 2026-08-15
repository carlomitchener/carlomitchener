import os
from helpers import all_ids, ROOT
from helpers import load_json, save_json
from models import Mockup, Placement, Product, Variant

def get_primaries(data):
    if data == "Black":
        return ["Black"]
    if data == "White":
        return ["White"]
    if data == "Both":
        return ["Black", "White"]
    raise Exception(f"Unknown primaries: {data}")

def get_stitch_colors(product_data):
    if "product_options" not in product_data["data"]:
        return []
    for option in product_data["data"]["product_options"]:
        if option["name"] == "stitch_color":
            if isinstance(option["values"], dict):
                print("Stitch colors: DICT")
                values = list(option["values"].values())
                return sorted([v.capitalize() for v in values])
            elif isinstance(option["values"], list):
                print("Stitch colors: LIST")
                values = option["values"]
                return sorted([v.capitalize() for v in values])
    print("Stitch colors: NONE")
    return []

def get_technique(product_data):
    techniques = [t["key"] for t in product_data["data"]["techniques"]]
    if len(techniques) > 1:
        raise Exception("Multiple techniques found for product")
    return techniques[0]

def parse_placements(mockup_data):
    placements = [
        Placement(
            name=item["placement"],
            display=item["display_name"],
            width=item["print_area_width"],
            height=item["print_area_height"],
            dpi=item["dpi"],
            is_ignored=False
        )
        for item in mockup_data["data"]
        if item["print_area_type"] == "simple"
    ]
    unique_placements = []
    seen_placements = set()
    for p in placements:
        if p.name not in seen_placements:
            unique_placements.append(p)
            seen_placements.add(p.name)
    unique_placements = sorted(unique_placements, key=lambda p: p.name)
    return unique_placements

def parse_mockups(mockup_data):
    mockups = [
        Mockup(
            id=m["id"],
            category=m["category_name"],
            title=m["view_name"],
            variant_ids=m["restricted_to_variants"],
            is_ignored=False,
        )
        for item in mockup_data["data"]
        for m in item["mockup_styles"]
        if item["print_area_type"] == "simple"
    ]
    unique_mockups = []
    seen_mockups = set()
    for m in mockups:
        if m.alt not in seen_mockups:
            unique_mockups.append(m)
            seen_mockups.add(m.alt)
    unique_mockups = sorted(unique_mockups, key=lambda m: m.id)
    return unique_mockups

def parse_variants(variant_data, price_data):
    price_map = {
        item["id"]: item["techniques"][0]["price"]
        for item in price_data["data"]["variants"]
    }
    return [
        Variant(
            id=v["id"],
            size=v["size"],
            color=v["color"] if v["color"] else "White",
            price=price_map[v["id"]],
            is_ignored=False
        )
        for v in variant_data["data"]
    ]

def parse_products(ids: list[int]):
    print(f"Parsing {len(ids)} products")
    catalog = load_json(os.path.join(ROOT, "files/catalog.json"))
    catalog_dict = {product["id"]: product for product in catalog}
    for id in ids:
        print(f"Parsing: {id} - {catalog_dict[id]['title']}")
        product_data = load_json(os.path.join(ROOT, f"data/raw/products/{id}.json"))
        variant_data = load_json(os.path.join(ROOT, f"data/raw/variants/{id}.json"))
        price_data = load_json(os.path.join(ROOT, f"data/raw/prices/{id}.json"))
        mockup_data = load_json(os.path.join(ROOT, f"data/raw/mockups/{id}.json"))
        product = Product(
            id=id,
            category=catalog_dict[id]["category"],
            title=catalog_dict[id]["title"],
            technique=get_technique(product_data),
            primaries=get_primaries(catalog_dict[id]["primaries"]),
            stitch_colors=get_stitch_colors(product_data),
            placements=parse_placements(mockup_data),
            variants=parse_variants(variant_data, price_data),
            mockups=parse_mockups(mockup_data)
        )
        os.makedirs(os.path.join(ROOT, "data/products"), exist_ok=True)
        save_json(os.path.join(ROOT, f"data/products/{id}.json"), product.to_dict())
        print(f"Parsed: {product.desc}")
    print(f"Parsed {len(ids)} products")

if __name__ == "__main__":
    ids = all_ids()
    parse_products(ids)
