from automator.core.api import extract_gid, printful_request
from automator.core.errors import Retry, TaskAborted
from automator.core.models import Task
from automator.core.steps import Step

PRINTFUL_PING_URL = "sync/products/@"
MAX_PING_ATTEMPTS = 12

def wait(task: Task) -> None:
    count = task.metadata.get("ping_count", 0) + 1
    task.metadata["ping_count"] = count
    if count >= MAX_PING_ATTEMPTS:
        raise TaskAborted(f"ping_count {count} for task {task.key}")
    raise Retry(f"Current: {Step.PING}. Next: {Step.PING} ({count}/{MAX_PING_ATTEMPTS})")

def mrly_ping(task: Task) -> Task:
    shopify_id = extract_gid(task.product.shopify_id)
    result = printful_request(task, "GET", f"{PRINTFUL_PING_URL}{shopify_id}", allow_404=True)
    if not result:
        wait(task)
    data = result["result"]
    task.product.printful_id = data["sync_product"]["id"]
    synced = {sv["sku"]: sv["id"] for sv in data["sync_variants"]}
    for variant in task.variants:
        if variant.name not in synced:
            wait(task)
    for variant in task.variants:
        variant.printful_id = synced[variant.name]
    task.product.synced = True
    task.place(Step.SYNC)
    return task
