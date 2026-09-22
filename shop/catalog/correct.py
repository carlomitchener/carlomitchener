from helpers import all_ids, load_product, save_product

# DIMENSIONS

CORRECT_DIMS = {
    (1.2533333333333334, 0.5): (1.25, 0.5),
    (15.033333333333333, 7.746666666666667): (15.03, 7.75),
    (18.973333333333333, 2.0): (18.97, 2.0),
    (52.81333333333333, 31.0): (52.81, 31.0),
}

# PLACEMENTS

IGNORED_PLACEMENTS = [
    "label_inside",
    "label_outside",
    "label_outside_back",
    "label_outside_front",
]

# VARIANTS

IGNORED_VARIANTS = [
    {"id": 84, "title": "Tote Bag", "variants": [8904, 8905],
     "why": "red and yellow, reason not recorded"},
    {"id": 274, "title": "Large Tote Bag w/ Pocket", "variants": [9040, 9041],
     "why": "red and yellow, reason not recorded"},
    {"id": 630, "title": "Bandana", "variants": [16031, 16032],
     "why": "sizes S and M, reason not recorded"},
]

# MOCKUPS

IGNORED_MOCKUP_CATEGORIES = [
    "Halloween",
    "Holiday season",
    "Spring/summer vibes",
]

IGNORED_MOCKUP_TITLES = [
    "French",
    "German",
    "Italian",
    "Japanese",
    "Spanish",
]

IGNORED_MOCKUPS = [
    {"id": 189, "title": "Women's Leggings", "mockups": [14947],
     "why": "not recorded"},
    {"id": 202, "title": "Women's Tank Top", "mockups": [15035],
     "why": "not recorded"},
    {"id": 279, "title": "Backpack", "mockups": [20739],
     "why": "comes back empty every batch; twin 16435 renders"},
    {"id": 288, "title": "Men's Leggings", "mockups": [16567],
     "why": "not recorded"},
    {"id": 322, "title": "Kids Leggings", "mockups": [2422, 2424],
     "why": "not recorded"},
    {"id": 323, "title": "Youth Leggings", "mockups": [18469],
     "why": "not recorded"},
    {"id": 389, "title": "Minimalist Backpack", "mockups": [20199],
     "why": "comes back empty every batch; twin 20198 renders"},
    {"id": 400, "title": "Men's Joggers", "mockups": [3179],
     "why": "not recorded"},
    {"id": 401, "title": "Women's Joggers", "mockups": [3198],
     "why": "not recorded"},
    {"id": 420, "title": "Neck Gaiter", "mockups": [3734],
     "why": "comes back empty every batch; twin 3730 renders"},
    {"id": 458, "title": "Beanie", "mockups": [6328],
     "why": "not recorded"},
    {"id": 465, "title": "Duffle Bag",
     "why": "comes back empty every batch; twins 7229 and 7244 render",
     "mockups": [7230, 7231, 7235, 7236, 7237, 7238, 7239, 7245, 7246, 7247]},
    {"id": 630, "title": "Bandana",
     "why": "restricted to the ignored variants 16031 and 16032",
     "mockups": [4350, 4353, 4356, 4357, 4359, 4360, 4362, 4363, 4365, 4366]},
    {"id": 654, "title": "Reversible Bucket Hat",
     "why": "the inside views, reason not recorded",
     "mockups": [4865, 4873, 4875, 4877, 4884, 4885, 4886, 4887,
                 4888, 4889, 4894, 4895, 4896, 4897, 4898, 4900]},
    {"id": 693, "title": "Unisex Mesh Shorts", "mockups": [8605],
     "why": "not recorded"},
    {"id": 730, "title": "Unisex Hockey Fan Jersey", "mockups": [20834],
     "why": "comes back empty every batch; twin 20835 renders"},
    {"id": 792, "title": "Unisex Baseball Jersey", "mockups": [23389],
     "why": "comes back empty every batch; twin 23388 renders"},
]

# CORRECT

def ignored(table: list[dict], key: str, id: int) -> list[int]:
    return [i for item in table if item["id"] == id for i in item[key]]

def reset(product):
    for placement in product.placements:
        placement.is_ignored = False
    for variant in product.variants:
        variant.is_ignored = False
    for mockup in product.mockups:
        mockup.is_ignored = False

def correct_dims(product):
    for placement in product.placements:
        if placement.dims in CORRECT_DIMS:
            placement.width, placement.height = CORRECT_DIMS[placement.dims]
        if any(round(v, 2) != v for v in placement.dims):
            print(f"Odd dims: {product.desc} - {placement.name} - {placement.dims}")

def correct_placements(product):
    for placement in product.placements:
        if placement.name in IGNORED_PLACEMENTS:
            placement.is_ignored = True
            print(f"Ignored placement: {product.desc} - {placement.name}")

def correct_variants(product):
    ids = ignored(IGNORED_VARIANTS, "variants", product.id)
    for variant in product.variants:
        if variant.id in ids:
            variant.is_ignored = True
            print(f"Ignored variant: {product.desc} - {variant.desc}")

def correct_mockups(product):
    ids = ignored(IGNORED_MOCKUPS, "mockups", product.id)
    for mockup in product.mockups:
        if (
            mockup.category in IGNORED_MOCKUP_CATEGORIES
            or any(title in mockup.title for title in IGNORED_MOCKUP_TITLES)
            or mockup.id in ids
        ):
            mockup.is_ignored = True
            print(f"Ignored mockup: {product.desc} - {mockup.alt}")

def correct_products(ids: list[int]):
    print(f"Correcting {len(ids)} products")
    for id in ids:
        product = load_product(id)
        reset(product)
        correct_dims(product)
        correct_placements(product)
        correct_variants(product)
        correct_mockups(product)
        save_product(product)
    print(f"Corrected {len(ids)} products")

if __name__ == "__main__":
    ids = all_ids()
    correct_products(ids)
