import time
from automator.core.api import logger, printful_request
from automator.core.config import MOCKUP_INFLIGHT, MOCKUP_POSTS, MOCKUP_RENDERS
from automator.core.errors import Retry, TaskAborted
from automator.core.models import Mockup, Task
from automator.core.steps import Step

PRINTFUL_MOCKUP_URL = "v2/mockup-tasks"
FORMAT = "png"
MOCKUP_WIDTH_PX = 1000

def choose_variant(task: Task) -> int:
    return task.variants[-1].id

def allowed(mockup: Mockup, variant_id: int) -> bool:
    if not mockup.variant_ids:
        return True
    return variant_id in mockup.variant_ids

def unrequested(task: Task) -> list[Mockup]:
    return [m for m in task.mockups if not m.job and not m.url]

def in_flight(task: Task) -> list[str]:
    return sorted({m.job for m in task.mockups if m.job and not m.url})

def batch_size(task: Task) -> int:
    return max(1, MOCKUP_RENDERS // max(1, len(task.placements)))

def placement_files(task: Task) -> list[dict]:
    files: list[dict] = []
    for placement in task.placements:
        url = next(pf.url for pf in task.printfiles if pf.id == placement.id)
        files.append({
            "placement": placement.name,
            "technique": task.product.technique,
            "print_area_type": "simple",
            "layers": [{"type": "file", "url": url}],
        })
    return files

def build_product(task: Task, batch: list[Mockup]) -> dict:
    product = {
        "source": "catalog",
        "catalog_product_id": task.product.id,
        "catalog_variant_ids": [choose_variant(task)],
        "mockup_style_ids": [m.id for m in batch],
        "placements": placement_files(task),
    }
    stitch = task.stitch_color
    if stitch:
        product["product_options"] = [{"name": "stitch_color", "value": stitch}]
    return product

def build_payload(task: Task, batch: list[Mockup]) -> dict:
    return {
        "format": FORMAT,
        "mockup_width_px": MOCKUP_WIDTH_PX,
        "products": [build_product(task, batch)],
    }

def post_batch(task: Task, batch: list[Mockup]) -> None:
    result = printful_request(task, "POST", PRINTFUL_MOCKUP_URL, data=build_payload(task, batch))
    if not result.get("data"):
        raise TaskAborted(f"empty mockup task response for {task.key}")
    job = str(result["data"][0]["id"])
    for mockup in batch:
        mockup.job = job
    task.metadata.setdefault("waiting_since", int(time.time()))
    logger.info(f"{task.desc} mockup task {job} takes {len(batch)} styles")

def post_batches(task: Task) -> int:
    posted = 0
    while posted < MOCKUP_POSTS and len(in_flight(task)) < MOCKUP_INFLIGHT:
        batch = unrequested(task)[:batch_size(task)]
        if not batch:
            break
        post_batch(task, batch)
        posted += 1
    return posted

def mrly_mockup(task: Task) -> Task:
    variant_id = choose_variant(task)
    task.mockups = [m for m in task.mockups if allowed(m, variant_id)]
    if not task.mockups:
        raise TaskAborted(f"no mockup style allows variant {variant_id}")
    posted = post_batches(task)
    task.place(Step.PROCESS)
    raise Retry(f"{posted} mockup tasks posted, {len(unrequested(task))} styles queued")

if __name__ == "__main__":
    from automator.core.api import mint_token
    from automator.core.s3 import load_task, save_task
    mint_token()
    task = load_task()
    try:
        mrly_mockup(task)
    except Retry as note:
        print(note)
    save_task(task)
