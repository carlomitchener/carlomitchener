from helpers import all_ids, load_product, save_product

# DIMENSIONS
CORRUPT_DIMS = [
    (1.2533333333333334, 0.5),
    (33.58, 44.0),
    (52.81333333333333, 31.0)
]

CORRECT_DIMS = [
    (1.25, 0.5),
    (33.5, 44),
    (52.81, 31),
]

def correct_dimensions():
    ids = all_ids()
    print(f"Correcting dimensions for {len(ids)} products")
    for id in ids:
        product = load_product(id)
        modified = False
        for placement in product.placements:
            if placement.dims in CORRUPT_DIMS:
                print(f"Correcting: {product.desc} - {placement.name}")
                old = placement.dims
                data = CORRECT_DIMS[CORRUPT_DIMS.index(placement.dims)]
                placement.width = data[0]
                placement.height = data[1]
                new = placement.dims
                print(f"Corrected: {old} - {new}")
                modified = True
        if modified:
            save_product(product)
        else:
            print(f"Skipping: {product.desc}")
    print(f"Corrected dimensions for {len(ids)} products")

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

IGNORED_MOCKUPS = {
    "189": [
        14947
    ],
    "202": [
        15035
    ],
    "288": [
        16567
    ],
    "322": [
        2422,
        2424,
    ],
    "323": [
        18469
    ],
    "400": [
        3179
    ],
    "401": [
        3198
    ],
    "458": [
        6328
    ],
    "654": [
        4865,
        4873,
        4875,
        4877,
        4884,
        4885,
        4886,
        4887,
        4888,
        4889,
        4894,
        4895,
        4896,
        4897,
        4898,
        4900,
    ],
    "693": [
        8605
    ]
}

IGNORED_MOCKUPS_BY_VARIANT = [
    {
        "id": 630,
        "variant_ids": [
            16031,
            16032
        ]
    }
]

def correct_mockups():
    ids = all_ids()
    print(f"Correcting mockups for {len(ids)} products")
    for id in ids:
        product = load_product(id)
        modified = False
        target_variant_ids = []
        for item in IGNORED_MOCKUPS_BY_VARIANT:
            if item["id"] == product.id:
                target_variant_ids = item["variant_ids"]
                break
        for mockup in product.mockups:
            should_ignore = False
            if mockup.category in IGNORED_MOCKUP_CATEGORIES:
                should_ignore = True
            if not should_ignore:
                for title in IGNORED_MOCKUP_TITLES:
                    if title in mockup.title:
                        should_ignore = True
                        break
            if not should_ignore and str(product.id) in IGNORED_MOCKUPS:
                if mockup.id in IGNORED_MOCKUPS[str(product.id)]:
                    should_ignore = True
            if not should_ignore and target_variant_ids and mockup.variant_ids:
                for vid in mockup.variant_ids:
                    if vid in target_variant_ids:
                        should_ignore = True
                        break
            if should_ignore and not mockup.is_ignored:
                print(f"Ignored: {mockup.alt}")
                mockup.is_ignored = True
                modified = True
        if modified:
            save_product(product)
        else:
            print(f"Skipping: {product.desc}")
    print(f"Corrected mockups for {len(ids)} products")

# PLACEMENTS

def search_placements(query: str):
    ids = all_ids()
    print(f"Searching for \"{query}\" placements in {len(ids)} products")
    for id in ids:
        product = load_product(id)
        for placement in product.placements:
            if query.lower() in placement.desc.lower():
                print(f"{product.desc} - {placement.desc} - {placement.dims}")
    print("Search complete")

DEFAULT_PLACEMENTS = [
    "label_inside",
    "label_outside",
    "label_outside_back",
    "label_outside_front",
    "label_inside_dtfabric",
]

def correct_placements():
    ids = all_ids()
    print(f"Blacklisting default placements for {len(ids)} products")
    for id in ids:
        product = load_product(id)
        target_placements = [p.name for p in product.placements if p.name in DEFAULT_PLACEMENTS]
        if not target_placements:
            print(f"Skipping: {product.desc}")
            continue
        print(f"Blacklisting: {product.desc} - {target_placements}")
        modified = False
        for placement in product.placements:
            if placement.name in target_placements and not placement.is_ignored:
                print(f"Blacklisting: {product.desc} - {placement.name}")
                placement.is_ignored = True
                modified = True
        if modified:
            save_product(product)
    print(f"Blacklisted default placements for {len(ids)} products")

# VARIANTS

IGNORED_VARIANTS = [
    {
        "id": 84,
        "title": "Tote Bag",
        "variants": [
            8904,
            8905
        ]
    },
    {
        "id": 274,
        "title": "Large Tote Bag",
        "variants": [
            9040,
            9041
        ]
    },
    {
        "id": 630,
        "title": "Bandana",
        "variants": [
            16031,
            16032
        ]
    }
]

def correct_variants():
    print(f"Setting ignored variants for {len(IGNORED_VARIANTS)} products")
    for item in IGNORED_VARIANTS:
        id = item["id"]
        product = load_product(id)
        print(f"Setting ignored for: {product.desc}")
        modified = False
        for variant in product.variants:
            if variant.id in item["variants"]:
                print(f"Ignored: {variant.desc}")
                variant.is_ignored = True
                modified = True
        if modified:
            save_product(product)
        else:
            print(f"Skipping: {product.desc}")
    print(f"Set ignored variants for {len(IGNORED_VARIANTS)} products")

if __name__ == "__main__":
    correct_dimensions()
    correct_mockups()
    correct_placements()
    correct_variants()
