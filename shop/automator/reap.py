import time
from automator.core.api import delete_product, logger
from automator.core.config import LIVE_DAYS
from automator.core.models import Task
from automator.core.s3 import TASKS_PREFIX, cdn_prefix, delete_folder, delete_key, get_json, list_objects, load_design, wake_site

def archives() -> list[dict]:
    return [obj for obj in list_objects(TASKS_PREFIX) if obj["Key"].endswith(".json")]

def expired(now: float) -> dict:
    cutoff = now - LIVE_DAYS * 86400
    old = [obj for obj in archives() if obj["LastModified"].timestamp() < cutoff]
    return min(old, key=lambda obj: obj["LastModified"]) if old else None

def reap_design(task: Task) -> None:
    prefix = f"{TASKS_PREFIX}{task.design}-"
    if any(obj["Key"].startswith(prefix) for obj in archives()):
        return
    design = load_design()
    if design and design.key == task.design:
        return
    count = delete_folder(cdn_prefix(task.design))
    logger.info(f"design {task.design} reaped, {count} files")

def mrly_reap() -> None:
    found = expired(time.time())
    if not found:
        return
    task = Task.from_dict(get_json(found["Key"]))
    if task.product.shopify_id:
        delete_product(task)
    delete_folder(cdn_prefix(task.key))
    delete_key(found["Key"])
    logger.info(f"{task.desc} reaped after {LIVE_DAYS} days")
    reap_design(task)
    wake_site(f"reaped {task.key}")

if __name__ == "__main__":
    from automator.core.api import mint_token
    mint_token()
    mrly_reap()
