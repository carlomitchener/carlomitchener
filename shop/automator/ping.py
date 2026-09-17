from automator.core.api import extract_gid, printful_request
from automator.core.clock import wait
from automator.core.config import PING_BUDGET
from automator.core.models import Task
from automator.core.steps import Step

PRINTFUL_PING_URL = "sync/products/@"

def mrly_ping(task: Task) -> Task:
    shopify_id = extract_gid(task.product.shopify_id)
    result = printful_request(task, "GET", f"{PRINTFUL_PING_URL}{shopify_id}", allow_404=True)
    if not result:
        wait(task, PING_BUDGET, "printful has not pulled the product")
    data = result["result"]
    task.product.printful_id = data["sync_product"]["id"]
    synced = {sv["sku"]: sv["id"] for sv in data["sync_variants"]}
    missing = [v.name for v in task.variants if v.name not in synced]
    if missing:
        wait(task, PING_BUDGET, f"printful is missing {len(missing)} variants")
    for variant in task.variants:
        variant.printful_id = synced[variant.name]
    task.product.synced = True
    task.metadata.pop("waiting_since", None)
    task.place(Step.SYNC)
    return task

if __name__ == "__main__":
    from automator.core.errors import Retry
    from automator.core.s3 import load_task, save_task
    task = load_task()
    try:
        task = mrly_ping(task)
    except Retry as note:
        print(note)
    save_task(task)
    print(task.key, task.step)
