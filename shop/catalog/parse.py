from catalog.fetch import raw_path
from catalog.helpers import catalog_map, save_product
from catalog.models import Mockup, Placement, Product, Variant
from env import load_json

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
            values = option["values"]
            if isinstance(values, dict):
                values = list(values.values())
            return sorted([v.capitalize() for v in values])
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
    return sorted(unique_placements, key=lambda p: p.name)

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
    return sorted(unique_mockups, key=lambda m: m.id)

def parse_variants(variant_data, price_data):
    cost_map = {
        item["id"]: item["techniques"][0]["price"]
        for item in price_data["data"]["variants"]
    }
    return [
        Variant(
            id=v["id"],
            size=str(v["size"]),
            color=v["color"] if v["color"] else "White",
            cost=cost_map[v["id"]],
            is_ignored=False
        )
        for v in variant_data["data"]
    ]

def parse_products(ids: list[int]):
    print(f"Parsing {len(ids)} products")
    rows = catalog_map()
    for id in ids:
        row = rows[id]
        print(f"Parsing: {id} - {row['title']}")
        product_data = load_json(raw_path("products", id))
        variant_data = load_json(raw_path("variants", id))
        price_data = load_json(raw_path("prices", id))
        mockup_data = load_json(raw_path("mockups", id))
        product = Product(
            id=id,
            category=row["category"],
            title=row["title"],
            technique=get_technique(product_data),
            primaries=get_primaries(row["primaries"]),
            stitch_colors=get_stitch_colors(product_data),
            placements=parse_placements(mockup_data),
            variants=parse_variants(variant_data, price_data),
            mockups=parse_mockups(mockup_data)
        )
        save_product(product)
        print(f"Parsed: {product.desc}")
    print(f"Parsed {len(ids)} products")
