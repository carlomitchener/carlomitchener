import time
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

def build_product(task: Task) -> dict:
    variant_id = choose_variant(task)
    style_ids = [m.id for m in task.mockups if not m.url and allowed(m, variant_id)]
    if not style_ids:
        raise TaskAborted(f"no mockup style allows variant {variant_id}")
    product = {
        "source": "catalog",
        "catalog_product_id": task.product.id,
        "catalog_variant_ids": [variant_id],
        "mockup_style_ids": style_ids,
        "placements": placement_files(task),
    }
    stitch = task.stitch_color
    if stitch:
        product["product_options"] = [{"name": "stitch_color", "value": stitch}]
    return product

def build_payload(task: Task) -> dict:
    return {
        "format": FORMAT,
        "mockup_width_px": MOCKUP_WIDTH_PX,
        "products": [build_product(task)],
    }

def mrly_mockup(task: Task) -> Task:
    result = printful_request(task, "POST", PRINTFUL_MOCKUP_URL, data=build_payload(task))
    if not result.get("data"):
        raise TaskAborted(f"empty mockup task response for {task.key}")
    task.metadata["mockup_generator_id"] = result["data"][0]["id"]
    task.metadata["waiting_since"] = int(time.time())
    task.place(Step.PROCESS)
    raise Retry(f"mockup task {task.metadata['mockup_generator_id']} requested")

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
