from automator.core.api import printful_request
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

def fetch_files(task: Task) -> list[dict]:
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

def fetch_product(task: Task) -> dict:
    variant_id = choose_variant(task)
    task.metadata["variant_ids"] = [variant_id]
    style_ids = [m.id for m in task.mockups if not m.url and allowed(m, variant_id)]
    if not style_ids:
        raise TaskAborted(f"no mockup style allows variant {variant_id}")
    product = {
        "source": "catalog",
        "catalog_product_id": task.product.id,
        "catalog_variant_ids": [variant_id],
        "mockup_style_ids": style_ids,
        "placements": fetch_files(task),
    }
    if task.product.stitch_colors:
        product["product_options"] = [{"name": "stitch_color", "value": task.stitch_color}]
    return product

def create_payload(task: Task) -> dict:
    return {
        "format": FORMAT,
        "mockup_width_px": MOCKUP_WIDTH_PX,
        "products": [fetch_product(task)],
    }

def create_mockup_task(task: Task, payload: dict) -> Task:
    result = printful_request(task, "POST", PRINTFUL_MOCKUP_URL, data=payload)
    if not result.get("data"):
        raise TaskAborted(f"empty mockup task response for {task.key}")
    task.metadata["mockup_generator_id"] = result["data"][0]["id"]
    return task

def mrly_mockup(task: Task) -> Task:
    payload = create_payload(task)
    task = create_mockup_task(task, payload)
    task.place(Step.PROCESS)
    raise Retry(f"Current: {Step.MOCKUP}. Next: {Step.PROCESS}")
