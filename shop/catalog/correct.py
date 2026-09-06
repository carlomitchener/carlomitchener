from catalog.helpers import load_corrections, load_product, save_product

def reset(product):
    for placement in product.placements:
        placement.is_ignored = False
    for variant in product.variants:
        variant.is_ignored = False
    for mockup in product.mockups:
        mockup.is_ignored = False

def correct_dims(product, dims):
    for placement in product.placements:
        for item in dims:
            if list(placement.dims) == item["from"]:
                placement.width, placement.height = item["to"]
        for value in placement.dims:
            if round(value, 2) != value:
                print(f"Dims: {product.desc} - {placement.name} - {placement.dims}")
                break

def correct_placements(product, names):
    for placement in product.placements:
        if placement.name in names:
            print(f"Ignored placement: {product.desc} - {placement.name}")
            placement.is_ignored = True

def correct_variants(product, ids):
    for variant in product.variants:
        if variant.id in ids:
            print(f"Ignored variant: {product.desc} - {variant.desc}")
            variant.is_ignored = True

def correct_mockups(product, categories, titles, ids):
    for mockup in product.mockups:
        ignore = mockup.category in categories
        if not ignore:
            ignore = any(title in mockup.title for title in titles)
        if not ignore:
            ignore = mockup.id in ids
        if ignore:
            print(f"Ignored mockup: {product.desc} - {mockup.alt}")
            mockup.is_ignored = True

def correct_products(ids: list[int]):
    print(f"Correcting {len(ids)} products")
    corrections = load_corrections()
    categories = corrections["mockup_categories"]
    titles = corrections["mockup_titles"]
    placements = corrections["placements"]
    for id in ids:
        product = load_product(id)
        reset(product)
        correct_dims(product, corrections["dims"])
        correct_placements(product, placements)
        correct_variants(product, corrections["variants"].get(str(id), []))
        correct_mockups(product, categories, titles, corrections["mockups"].get(str(id), []))
        save_product(product)
        print(f"Corrected: {product.desc}")
    print(f"Corrected {len(ids)} products")
