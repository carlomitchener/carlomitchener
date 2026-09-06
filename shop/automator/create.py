import mrlypy.gen
import mrlypy.paint
import mrlypy.tile
import random
import time
from automator.core.api import logger
from automator.core.errors import NoTaskError
from automator.core.models import Mockup, Placement, Printfile, Task, Variant
from automator.core.s3 import load_paths, load_product, save_paths, task_exists
from automator.core.steps import Step
from mrlypy.core.helpers import hex_key
from mrlypy.paint.colors import get_primary_inks
from typing import Any

MAX_VARIANTS = 100
MAX_PATHS = 20

def create_task() -> Task:
    task = Task()
    task.created_at = int(time.time())
    while True:
        key = hex_key()
        if not task_exists(key):
            task.key = key
            return task

def choose_path(task: Task) -> Task:
    paths = load_paths()
    open_products = [product for product, state in paths.items() if state is True]
    if not open_products:
        for product, state in paths.items():
            if state is False:
                paths[product] = True
        open_products = [product for product, state in paths.items() if state is True]
    if not open_products:
        raise NoTaskError("every path is quarantined")
    product = random.choice(open_products)
    paths[product] = False
    save_paths(paths)
    task.product.id = int(product)
    return task

def quarantine(task: Task) -> None:
    paths = load_paths()
    paths[str(task.product.id)] = None
    save_paths(paths)

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

def create_keys(items: list[Any], task_key: str) -> list[Any]:
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

def dedup_variants(task: Task) -> Task:
    kept: dict[str, Variant] = {}
    for variant in task.variants:
        first = kept.get(variant.size)
        if first is None:
            kept[variant.size] = variant
            continue
        if first.color != variant.color:
            logger.info(f"{task.desc} dropped variant {variant.id} size {variant.size} colour {variant.color}")
    task.variants = list(kept.values())[:MAX_VARIANTS]
    return task

def parse_variants(task: Task, data: dict) -> Task:
    task.variants = [
        Variant(
            id=variant["id"],
            cost=variant["cost"],
            size=variant["size"],
            color=variant["color"],
        )
        for variant in data["variants"]
        if not variant["is_ignored"]
    ]
    task = dedup_variants(task)
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
        printfiles[placement.id] = Printfile(
            id=placement.id,
            width=placement.width,
            height=placement.height,
            dpi=placement.dpi,
        )
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

def open_product(task: Task) -> Task:
    for _ in range(MAX_PATHS):
        task = choose_path(task)
        try:
            return parse_product(task)
        except NoTaskError:
            quarantine(task)
            logger.info(f"quarantined product {task.product.id}, no product json in the bucket")
    raise NoTaskError(f"no product json under {MAX_PATHS} open paths")

def mrly_create() -> Task:
    task = create_task()
    task = open_product(task)
    task = create_variation(task)
    task.place(Step.GENERATE)
    return task
