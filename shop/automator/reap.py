import time
from automator.core.api import delete_product, logger
from automator.core.config import LIVE_DAYS
from automator.core.models import Task
from automator.core.s3 import TASKS_PREFIX, cdn_prefix, delete_folder, get_json, list_objects, task_key, task_prefix

def archived() -> list[Task]:
    tasks = []
    for obj in list_objects(TASKS_PREFIX):
        parts = obj["Key"][len(TASKS_PREFIX):].split("/")
        if len(parts) == 2 and obj["Key"] == task_key(parts[0]):
            tasks.append(Task.from_dict(get_json(obj["Key"])))
    return tasks

def expired(now: float) -> Task:
    cutoff = now - LIVE_DAYS * 86400
    old = [task for task in archived() if (task.updated_at or 0) < cutoff]
    return min(old, key=lambda task: task.updated_at or 0) if old else None

def mrly_reap() -> None:
    task = expired(time.time())
    if not task:
        return
    if task.product.shopify_id:
        delete_product(task)
    delete_folder(cdn_prefix(task.key))
    delete_folder(task_prefix(task.key))
    logger.info(f"{task.desc} reaped after {LIVE_DAYS} days")
