import mrlypy.gen
import mrlypy.paint
import mrlypy.tile
import random
import time
from core.amazon import task_exists, load_paths, load_product, save_paths
from core.helpers import get_admin_token, hex_key
from core.models import Mockup, Placement, Printfile, Task, Variant
from core.steps import Step
from mrlypy.paint.colors import get_primary_inks
from typing import Any

def create_task() -> Task:
    task = Task()
    task.created_at = int(time.time())
    task.shopify_token = get_admin_token()
    while True:
        key = hex_key()
        if not task_exists(key):
            task.key = key
            return task

def choose_path(task: Task) -> Task:
    paths = load_paths()
    available_products = [product for product, open in paths.items() if open]
    if not available_products:
        for product in paths:
            paths[product] = True
        available_products = list(paths.keys())
    product = random.choice(available_products)
    paths[product] = False
    save_paths(paths)
    task.product.id = int(product)
    return task

def parse_basics(task: Task, data: dict) -> Task:
    task.product.id = data["id"]
    task.product.category = data["category"]
    task.product.title = data["title"]
    task.product.technique = data["technique"]
    task.product.primaries = data["primaries"]
    task.product.stitch_colors = data["stitch_colors"]
    return task

def parse_placements(task: Task, data: dict) -> Task:
    task.placements = [
        Placement(
            name=placement["name"],
            width=placement["width"],
            height=placement["height"],
            dpi=placement["dpi"],
        )
        for placement in data["placements"]
        if not placement["is_ignored"]
    ]
    return task

def create_keys(items: list[Any], task_key: str):
    seen: set[str] = set()
    for item in items:
        while True:
            key = hex_key()
            if key not in seen:
                seen.add(key)
                break
        item.key = key
        item.name = f"{task_key}-{key}"
    return items

def parse_variants(task: Task, data: dict) -> Task:
    task.variants = [
        Variant(
            id=variant["id"],
            price=variant["price"],
            size=variant["size"],
            color=variant["color"],
        )
        for variant in data["variants"]
        if not variant["is_ignored"]
    ]
    task.variants = create_keys(task.variants, task.key)
    return task  

def parse_mockups(task: Task, data: dict) -> Task:
    task.mockups = [
        Mockup(
            id=mockup["id"],
            category=mockup["category"],
            title=mockup["title"],
            variant_ids=mockup["variant_ids"],
        )
        for mockup in data["mockups"]
        if not mockup["is_ignored"]
    ]
    task.mockups = create_keys(task.mockups, task.key)
    return task

def parse_printfiles(task: Task) -> Task:
    printfiles = {}
    for placement in task.placements:
        if placement.id in printfiles:
            continue
        printfile = Printfile(
            id=placement.id,
            width=placement.width,
            height=placement.height,
            dpi=placement.dpi
        )
        printfiles[placement.id] = printfile
    task.printfiles = list(printfiles.values())
    task.printfiles = create_keys(task.printfiles, task.key)
    return task

def parse_product(task: Task) -> Task:
    data = load_product(task.product.id)
    task = parse_basics(task, data)
    task = parse_placements(task, data)
    task = parse_variants(task, data)
    task = parse_mockups(task, data)
    task = parse_printfiles(task)
    return task

def create_variation(task: Task) -> Task:
    primaries = get_primary_inks(task.product.primaries)
    config = mrlypy.gen.Config(
        tile=mrlypy.tile.Config(min_size=3, max_size=9, anti=False),
        paint=mrlypy.paint.Config(primaries=primaries),
        files=[],
    )
    gen = mrlypy.gen.create(config)
    gen.key = task.key
    task.seed = gen.seed
    task.variation = gen.to_dict()
    return task

def mrly_create() -> Task:
    task = create_task()
    task = choose_path(task)
    task = parse_product(task)
    task = create_variation(task)
    task.place(Step.GENERATE)
    return task

def test_create():
    from core.amazon import save_task
    task = mrly_create()
    save_task(task)

if __name__ == "__main__":
    test_create()
