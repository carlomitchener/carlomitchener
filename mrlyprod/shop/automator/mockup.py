from core.errors import Retry
from core.helpers import printful_request
from core.models import Task
from core.steps import Step

PRINTFUL_MOCKUP_URL = "v2/mockup-tasks"
FORMAT = "png"
MOCKUP_WIDTH_PX = 1000

def fetch_files(task: Task) -> list[dict]:
    files: list[dict] = []
    for placement in task.placements:
        url = next(
            pf.url for pf in task.printfiles
            if pf.id == placement.id
        )
        files.append({
            "placement": placement.name,
            "technique": task.product.technique,
            "print_area_type": "simple",
            "layers": [
                {
                    "type": "file",
                    "url": url
                }
            ]
        })
    return files

def fetch_product(task: Task) -> dict:
    variant_ids = [task.variants[-1].id]
    task.metadata["variant_ids"] = variant_ids
    style_ids = [m.id for m in task.mockups if not m.url]
    files = fetch_files(task)
    product = {
        "source": "catalog",
        "catalog_product_id": task.product.id,
        "catalog_variant_ids": variant_ids,
        "mockup_style_ids": style_ids,
        "placements": files,
    }
    if task.product.stitch_colors:
        product["product_options"] = [
            {
                "name": "stitch_color",
                "value": task.stitch_color
            }
        ]
    return product

def create_payload(task: Task) -> dict:
    return {
        "format": FORMAT,
        "mockup_width_px": MOCKUP_WIDTH_PX,
        "products": [fetch_product(task)],
    }

def create_task(task: Task, payload: dict) -> Task:
    result = printful_request(
        task=task,
        method="POST",
        url=PRINTFUL_MOCKUP_URL,
        data=payload
    )
    if not result:
        raise Exception(f"Mockup generation failed for task {task.key}")
    mockup_generator_id = result["data"][0]["id"]
    task.metadata["mockup_generator_id"] = mockup_generator_id
    return task

def mrly_mockup(task: Task) -> Task:
    payload = create_payload(task)
    task = create_task(task, payload)
    task.place(Step.PROCESS)
    raise Retry(f"Current: {Step.MOCKUP}. Next: {Step.PROCESS}")

def test_mockup():
    from core.amazon import load_task, save_task
    task = load_task()
    try: task = mrly_mockup(task)
    except Retry: save_task(task)

if __name__ == "__main__":
    test_mockup()
