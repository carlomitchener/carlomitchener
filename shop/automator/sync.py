import time
from automator.core.api import printful_request
from automator.core.errors import Retry, TaskAborted
from automator.core.models import Task, Variant
from automator.core.steps import Step

PRINTFUL_SYNC_URL = "sync/variant/"
VISIBLE = False
DELAY = 0.6
BATCH = 30

def fetch_files(task: Task) -> list[dict]:
    files: list[dict] = []
    for placement in task.placements:
        printfile = next(pf for pf in task.printfiles if pf.id == placement.id)
        files.append({
            "type": placement.name,
            "url": printfile.url,
            "filename": f"{printfile.name}.png",
            "visible": VISIBLE,
        })
    return files

def create_payload(task: Task, variant: Variant) -> dict:
    return {
        "variant_id": variant.id,
        "retail_price": variant.cost,
        "sku": variant.name,
        "is_ignored": False,
        "files": fetch_files(task),
        "options": [{"id": "stitch_color", "value": task.stitch_color}],
    }

def sync_variant(task: Task, variant: Variant) -> Task:
    payload = create_payload(task, variant)
    result = printful_request(
        task,
        "PUT",
        f"{PRINTFUL_SYNC_URL}{variant.printful_id}",
        data=payload,
    )
    if not result:
        raise Retry(f"Current: {Step.SYNC}. Next: {Step.SYNC}")
    sync_variant_data = result["result"]["sync_variant"]
    if not sync_variant_data["synced"]:
        raise TaskAborted(f"variant {variant.name} not synced")
    if sync_variant_data["is_ignored"]:
        raise TaskAborted(f"variant {variant.name} ignored")
    variant.synced = True
    return task

def unsynced_variants(task: Task) -> list[Variant]:
    return [v for v in task.variants if not v.synced]

def process_batch(task: Task) -> Task:
    batch = unsynced_variants(task)[:BATCH]
    for i, variant in enumerate(batch):
        task = sync_variant(task, variant)
        if i < len(batch) - 1:
            time.sleep(DELAY)
    return task

def mrly_sync(task: Task) -> Task:
    task = process_batch(task)
    if unsynced_variants(task):
        task.place(Step.SYNC)
        raise Retry(f"Current: {Step.SYNC}. Next: {Step.SYNC}")
    task.place(Step.PUBLISH)
    return task
