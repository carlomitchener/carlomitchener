from fetch import load_raw_catalog
from helpers import all_ids

TECHNIQUE = "cut-sew"

MADE_ELSEWHERE = [
    {"id": 615, "title": "Men's Windbreaker", "where": "China"},
    {"id": 618, "title": "Unisex Track Pants", "where": "China"},
    {"id": 619, "title": "Women's Cropped Windbreaker", "where": "China"},
    {"id": 887, "title": "Shopping Bag", "where": "China"},
    {"id": 963, "title": "Utility Backpack", "where": "China"},
]

IGNORED = [
    {"id": 345, "title": "Kids Swimsuit", "why": "no adult twin"},
    {"id": 346, "title": "Youth Swimsuit", "why": "no adult twin"},
]

NOT_WORN = ["Flag", "Pet", "Pillow"]

ACCESSORIES = ["Bandana", "Beanie", "Bucket Hat", "Headband", "Neck Gaiter", "Scrunchie"]

BAGS = ["Backpack", "Bag", "Fanny Pack"]

AUDIENCES = {
    "Men's": "men",
    "Women's": "women",
    "Kids": "kids",
    "Youth": "youth",
    "Unisex": "unisex",
}

PREFIXES = {
    "men": "Men's",
    "women": "Women's",
    "kids": "Kids",
    "youth": "Youth",
    "unisex": "Unisex",
}

PAIRS = [("men", "women"), ("kids", "youth")]

# RULES

def is_cut_sew(technique: str) -> bool:
    return technique == TECHNIQUE

def is_made_here(id: int) -> bool:
    return id not in {item["id"] for item in MADE_ELSEWHERE}

def is_wanted(id: int) -> bool:
    return id not in {item["id"] for item in IGNORED}

def is_worn(name: str) -> bool:
    return not any(word in name for word in NOT_WORN)

def category(name: str) -> str:
    if any(word in name for word in BAGS):
        return "bags"
    if any(word in name for word in ACCESSORIES):
        return "accessories"
    for word, audience in AUDIENCES.items():
        if word in name.split():
            return audience
    if "Jersey" in name:
        return "unisex"
    return "women"

def base_title(name: str) -> str:
    words = [w for w in name.split() if w not in AUDIENCES and w != "Recycled"]
    return " ".join(words).replace("All-Over Print ", "")

def title(product: dict) -> str:
    prefix = PREFIXES.get(product["category"])
    return f"{prefix} {product['base']}" if prefix else product["base"]

def has_twin(product: dict, kept: dict) -> bool:
    for a, b in PAIRS:
        if product["category"] not in (a, b):
            continue
        other = b if product["category"] == a else a
        twins = {p["base"].lower() for p in kept.values() if p["category"] == other}
        return product["base"].lower() in twins
    return True

# FILTER

def filter_products(rows: dict) -> dict:
    kept = {}
    for id, row in rows.items():
        name, technique = row.rsplit(" - ", 1)
        if not is_cut_sew(technique) or not is_made_here(id):
            continue
        if not is_wanted(id) or not is_worn(name):
            continue
        kept[id] = {"category": category(name), "base": base_title(name)}
    return {id: p for id, p in kept.items() if has_twin(p, kept)}

def show(kept: dict) -> None:
    for cat in ["accessories", "bags", "kids", "men", "unisex", "women", "youth"]:
        rows = sorted((title(p), id) for id, p in kept.items() if p["category"] == cat)
        print(f"\n{cat} ({len(rows)})")
        for name, id in rows:
            print(f"  {id:>5} {name}")

def diff(kept: dict) -> None:
    catalog = set(all_ids())
    add = sorted(id for id in kept if id not in catalog)
    drop = sorted(id for id in catalog if id not in kept)
    print(f"\nFilter keeps {len(kept)}, catalog holds {len(catalog)}")
    for id in add:
        print(f"  add  {id:>5} {title(kept[id])}")
    for id in drop:
        print(f"  drop {id:>5}")
    if not add and not drop:
        print("  identical")

if __name__ == "__main__":
    kept = filter_products(load_raw_catalog())
    show(kept)
    diff(kept)
