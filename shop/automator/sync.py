import time
from automator.core import clock
from automator.core.api import printful_request
from automator.core.config import TICK_RESERVE
from automator.core.errors import Retry, TaskAborted
from automator.core.models import Task, Variant
from automator.core.steps import Step

PRINTFUL_SYNC_URL = "sync/variant/"
VISIBLE = False
DELAY = 0.6
BATCH = 30

def placement_files(task: Task) -> list[dict]:
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

def variant_payload(task: Task, variant: Variant) -> dict:
    payload = {
        "variant_id": variant.id,
        "retail_price": variant.cost,
        "sku": variant.name,
        "is_ignored": False,
        "files": placement_files(task),
    }
    stitch = task.stitch_color
    if stitch:
        payload["options"] = [{"id": "stitch_color", "value": stitch}]
    return payload

def sync_variant(task: Task, variant: Variant) -> Task:
    result = printful_request(task, "PUT", f"{PRINTFUL_SYNC_URL}{variant.printful_id}", data=variant_payload(task, variant))
    data = result["result"]["sync_variant"]
    if not data["synced"]:
        raise TaskAborted(f"variant {variant.name} not synced")
    if data["is_ignored"]:
        raise TaskAborted(f"variant {variant.name} ignored")
    variant.synced = True
    return task

def unsynced(task: Task) -> list[Variant]:
    return [v for v in task.variants if not v.synced]

def mrly_sync(task: Task) -> Task:
    batch = unsynced(task)[:BATCH]
    for i, variant in enumerate(batch):
        if clock.remaining() < TICK_RESERVE:
            raise Retry(f"tick reserve, {len(unsynced(task))} variants left")
        task = sync_variant(task, variant)
        if i < len(batch) - 1:
            time.sleep(DELAY)
    if unsynced(task):
        raise Retry(f"{len(unsynced(task))} variants left")
    task.place(Step.PUBLISH)
    return task

if __name__ == "__main__":
    from automator.core.s3 import load_task, save_task
    task = load_task()
    try:
        task = mrly_sync(task)
    except Retry as note:
        print(note)
    save_task(task)
    print(task.key, task.step)
