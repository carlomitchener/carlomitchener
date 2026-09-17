import mrlypy.gen
import mrlypy.paint
import mrlypy.tile
import random
import re
import time
from automator.core.api import logger
from automator.core.config import PRIMARIES
from automator.core.errors import NoTaskError
from automator.core.models import Design, Mockup, Placement, Printfile, Task, Variant
from automator.core.s3 import archive_exists, load_design, load_paths, load_product, save_design, save_paths, save_strikes
from automator.core.steps import Step
from mrlypy.core.helpers import hex_key
from mrlypy.paint.colors import get_primary_inks
from typing import Any

MAX_VARIANTS = 100
MAX_PATHS = 20
PRINTFILE = "printfile"

def slugify(text: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", str(text).lower()).strip("-") or "one-size"

# DESIGN

def new_design() -> Design:
    config = mrlypy.gen.Config(
        tile=mrlypy.tile.Config(min_size=3, max_size=9, anti=False),
        paint=mrlypy.paint.Config(primaries=get_primary_inks(PRIMARIES)),
        files=[],
    )
    gen = mrlypy.gen.create(config)
    gen = mrlypy.gen.generate(gen)
    design = Design(key=gen.key, seed=gen.seed, created_at=int(time.time()), variation=gen.to_dict())
    save_design(design)
    logger.info(f"design {design.key} rolled: {design.group} {design.variation.get('edition')} {design.paint.get('primary')} {design.paint.get('secondary')}")
    return design

def current_design() -> Design:
    return load_design() or new_design()

# PATHS

def choose_path(task: Task, design: Design) -> tuple[Task, Design]:
    paths = load_paths()
    open_products = [product for product, state in paths.items() if state is True]
    if not open_products:
        for product, state in paths.items():
            if state is False:
                paths[product] = True
        open_products = [product for product, state in paths.items() if state is True]
        if open_products:
            logger.info(f"round complete, reopened {len(open_products)} products")
            save_strikes({})
            design = new_design()
    if not open_products:
        raise NoTaskError("every path is quarantined")
    product = random.choice(open_products)
    paths[product] = False
    save_paths(paths)
    task.product.id = int(product)
    return task, design

def quarantine(task: Task) -> None:
    paths = load_paths()
    paths[str(task.product.id)] = None
    save_paths(paths)

# PRODUCT

def parse_basics(task: Task, data: dict) -> Task:
    task.product.id = data["id"]
    task.product.category = data["category"]
    task.product.title = data["title"]
    task.product.handle = data["handle"]
    task.product.technique = data["technique"]
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

def name_items(items: list[Any], task_key: str, suffix) -> list[Any]:
    seen: set[str] = set()
    for item in items:
        name = f"{task_key}-{suffix(item)}"
        while name in seen:
            name = f"{task_key}-{suffix(item)}-{hex_key(4)}"
        seen.add(name)
        item.name = name
    return items

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
    ][:MAX_VARIANTS]
    if not task.variants:
        raise NoTaskError(f"product {task.product.id} has no variant")
    task.variants = name_items(task.variants, task.key, lambda variant: slugify(variant.size))
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
    task.mockups = name_items(task.mockups, task.key, lambda mockup: str(mockup.id))
    return task

def name_printfiles(printfiles: list[Printfile]) -> list[Printfile]:
    if len(printfiles) == 1:
        printfiles[0].name = PRINTFILE
        return printfiles
    for i, printfile in enumerate(printfiles, 1):
        printfile.name = f"{PRINTFILE}-{i}"
    return printfiles

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
    task.printfiles = name_printfiles(list(printfiles.values()))
    return task

def parse_product(task: Task) -> Task:
    data = load_product(task.product.id)
    task = parse_basics(task, data)
    task.key = f"{task.design}-{task.product.handle}"
    task = parse_placements(task, data)
    task = parse_variants(task, data)
    task = parse_mockups(task, data)
    task = parse_printfiles(task)
    return task

def open_product(task: Task, design: Design) -> Task:
    for _ in range(MAX_PATHS):
        task, design = choose_path(task, design)
        task.design = design.key
        task.seed = design.seed
        task.variation = dict(design.variation)
        try:
            task = parse_product(task)
        except NoTaskError as error:
            quarantine(task)
            logger.warning(f"quarantined product {task.product.id}: {error}")
            continue
        if archive_exists(task.key):
            logger.warning(f"{task.key} already archived, skipped this round")
            continue
        return task
    raise NoTaskError(f"no product opened under {MAX_PATHS} paths")

def mrly_create() -> Task:
    task = Task(created_at=int(time.time()))
    task = open_product(task, current_design())
    task.place(Step.GENERATE)
    return task

if __name__ == "__main__":
    from automator.core.s3 import save_task
    task = mrly_create()
    save_task(task)
    print(task.key, task.step)
