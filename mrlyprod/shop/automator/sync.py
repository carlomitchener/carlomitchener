import random
import time
from core.errors import Retry, TaskAborted
from core.helpers import printful_request
from core.models import Task, Variant
from core.steps import Step

PRINTFUL_SYNC_URL = "sync/variant/"
VISIBLE = False
TOKENS = random.randint(1, 9)

def fetch_files(task: Task) -> list[dict]:
    files: list[dict] = []
    for placement in task.placements:
        printfile = next(
            pf for pf in task.printfiles
            if pf.id == placement.id
        )
        files.append({
            "type": placement.name,
            "url": printfile.url,
            "filename": f"{printfile.name}.png",
            "visible": VISIBLE
        })
    return files

def create_payload(task: Task, variant: Variant) -> dict:
    return {
        "variant_id": variant.id,
        "retail_price": variant.price,
        "sku": variant.name,
        "is_ignored": False,
        "files": fetch_files(task),
        "options": [
            {
                "id": "stitch_color",
                "value": task.stitch_color
            }
        ]
    }

def sync_variant(task: Task, variant: Variant) -> Task:
    payload = create_payload(task, variant)
    result = printful_request(
        task=task,
        method="PUT",
        url=f"{PRINTFUL_SYNC_URL}{variant.printful_id}",
        data=payload
    )
    if not result:
        raise Retry(f"Current: {Step.SYNC}. Next: {Step.SYNC}")
    synced = result["result"]["sync_variant"]["synced"]
    if not synced:
        raise TaskAborted("Variant not synced")
    variant.synced = True
    is_ignored = result["result"]["sync_variant"]["is_ignored"]
    if is_ignored:
        raise TaskAborted("Variant ignored")
    return task

def unsynced_variants(task: Task) -> list[Variant]:
    return [v for v in task.variants if not v.synced]

def process_batch(task: Task) -> Task:
    unsynced = unsynced_variants(task)
    batch = unsynced[:TOKENS]
    count = len(batch)
    for i, variant in enumerate(batch):
        task = sync_variant(task, variant)
        if i < count - 1:
            delay = random.randint(1, 9) / 10
            time.sleep(delay)
    return task

def mrly_sync(task: Task) -> Task:
    task = process_batch(task)
    if unsynced_variants(task):
        task.place(Step.SYNC)
        raise Retry(f"Current: {Step.SYNC}. Next: {Step.SYNC}")
    else:
        task.place(Step.PUBLISH)
        return task

def test_sync():
    from core.amazon import load_task, save_task
    task = load_task()
    try: task = mrly_sync(task); save_task(task)
    except Retry: save_task(task)

if __name__ == "__main__":
    test_sync()
