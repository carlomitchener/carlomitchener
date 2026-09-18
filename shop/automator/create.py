import mrlypy.gen
import mrlypy.paint
import mrlypy.tile
import random
import re
import time
from automator import release
from automator.core.api import logger
from automator.core.config import PRIMARIES
from automator.core.errors import NoTaskError
from automator.core.models import OPEN, USED, Batch, Mockup, Placement, Printfile, Task, Variant
from automator.core.s3 import archive_exists, catalog_ids, load_batch, load_product, save_batch, save_strikes
from automator.core.steps import Step
from mrlypy.core.helpers import hex_key
from mrlypy.paint.colors import get_primary_inks
from typing import Any

MAX_VARIANTS = 100
MAX_PATHS = 20
PRINTFILE = "printfile"

def slugify(text: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", str(text).lower()).strip("-") or "one-size"

# BATCH

def new_batch(ids: list[str]) -> Batch:
    if not ids:
        raise NoTaskError("no catalog products in the bucket")
    first = next(iter(PRIMARIES.values()))
    config = mrlypy.gen.Config(
        tile=mrlypy.tile.Config(min_size=3, max_size=9, anti=False),
        paint=mrlypy.paint.Config(primaries=get_primary_inks([first])),
        files=[],
    )
    gen = mrlypy.gen.create(config)
    gen = mrlypy.gen.generate(gen)
    rows = {id: {primary: OPEN for primary in PRIMARIES} for id in ids}
    batch = Batch(design=gen.key, seed=gen.seed, created_at=int(time.time()), variation=gen.to_dict(), rows=rows)
    save_batch(batch)
    save_strikes({})
    logger.info(f"batch {batch.design} rolled over {len(rows)} products: {batch.group} {batch.variation.get('edition')} {batch.paint.get('secondary')}")
    return batch

def current_batch() -> Batch:
    batch = load_batch()
    if batch and not batch.complete:
        return batch
    if batch:
        release.mrly_release(batch)
    return new_batch(catalog_ids())

# ROWS

def next_cell(batch: Batch) -> tuple[str, str]:
    open_cells = batch.cells(OPEN)
    if not open_cells:
        raise NoTaskError(f"batch {batch.design} has no open cell")
    halves = [(id, primary) for id, primary in open_cells if USED in batch.rows[id].values()]
    if halves:
        return halves[0]
    id = random.choice(sorted({id for id, _ in open_cells}))
    return id, next(primary for primary, state in batch.rows[id].items() if state == OPEN)

def choose_row(task: Task, batch: Batch) -> Task:
    id, primary = next_cell(batch)
    batch.mark(id, primary, USED)
    save_batch(batch)
    task.product.id = int(id)
    task.primary = primary
    return task

def quarantine(task: Task, batch: Batch) -> None:
    batch.drop(task.product.id)
    save_batch(batch)

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
    task.key = task.key_for(task.primary)
    task = parse_placements(task, data)
    task = parse_variants(task, data)
    task = parse_mockups(task, data)
    task = parse_printfiles(task)
    return task

def open_product(task: Task, batch: Batch) -> Task:
    for _ in range(MAX_PATHS):
        task = choose_row(task, batch)
        task.design = batch.design
        task.seed = batch.seed
        task.variation = dict(batch.variation)
        try:
            task = parse_product(task)
        except NoTaskError as error:
            quarantine(task, batch)
            logger.warning(f"dropped product {task.product.id}: {error}")
            continue
        if archive_exists(task.key):
            logger.warning(f"{task.key} already archived, skipped this batch")
            continue
        return task
    raise NoTaskError(f"no product opened under {MAX_PATHS} rows")

def mrly_create() -> Task:
    task = Task(created_at=int(time.time()))
    task = open_product(task, current_batch())
    task.place(Step.GENERATE)
    return task

if __name__ == "__main__":
    from automator.core.s3 import save_task
    task = mrly_create()
    save_task(task)
    print(task.key, task.step)
