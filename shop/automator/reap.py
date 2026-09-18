import time
from automator.core import clock
from automator.core.api import logger
from automator.core.config import LIVE_DAYS, REAP_RESERVE
from automator.core.models import Batch, Task
from automator.core.s3 import TASKS_PREFIX, batch_key, cdn_prefix, delete_folder, delete_key, get_json, list_batches, list_objects, remove_product, wake_site

def expired(now: float) -> Batch:
    cutoff = now - LIVE_DAYS * 86400
    old = [batch for batch in list_batches() if batch.released_at and batch.released_at < cutoff]
    return min(old, key=lambda batch: batch.released_at) if old else None

def archives(design: str) -> list[str]:
    suffix = f"-{design}.json"
    return [obj["Key"] for obj in list_objects(TASKS_PREFIX) if obj["Key"].endswith(suffix)]

def reap_batch(batch: Batch) -> bool:
    for key in archives(batch.design):
        if clock.remaining() < REAP_RESERVE:
            logger.info(f"batch {batch.design} reaping pauses for this tick")
            return False
        task = Task.from_dict(get_json(key))
        remove_product(task)
        logger.info(f"{task.desc} reaped")
    count = delete_folder(cdn_prefix(batch.design))
    delete_key(batch_key(batch.design))
    logger.info(f"batch {batch.design} reaped after {LIVE_DAYS} days, {count} design files")
    return True

def mrly_reap() -> None:
    batch = expired(time.time())
    if not batch:
        return
    if reap_batch(batch):
        wake_site(f"reaped {batch.design}")

if __name__ == "__main__":
    from automator.core.api import mint_token
    mint_token()
    mrly_reap()
