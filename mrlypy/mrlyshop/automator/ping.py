from core.errors import Retry
from core.helpers import extract_gid, printful_request
from core.models import Task
from core.steps import Step

PRINTFUL_PING_URL = "sync/products/@"

def mrly_ping(task: Task) -> Task:
    result = printful_request(
        task=task,
        method="GET",
        url=f"{PRINTFUL_PING_URL}{extract_gid(task.product.shopify_id)}"
    )
    if not result:
        raise Retry(f"Current: {Step.PING}. Next: {Step.PING}")
    data = result["result"]
    sync_product = data["sync_product"]
    sync_variants = data["sync_variants"]
    task.product.printful_id = sync_product["id"]
    sv_map = {sv["sku"]: sv["id"] for sv in sync_variants}
    for variant in task.variants:
        variant.printful_id = sv_map[variant.name]
    task.product.synced = True
    task.place(Step.SYNC)
    return task

def test_ping():
    from core.amazon import load_task, save_task
    task = load_task()
    try: task = mrly_ping(task); save_task(task)
    except Retry: save_task(task)

if __name__ == "__main__":
    test_ping()
