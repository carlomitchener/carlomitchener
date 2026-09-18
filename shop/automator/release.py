import time
from automator.core.api import logger
from automator.core.models import DROPPED, USED, Batch
from automator.core.s3 import BATCH_KEY, batch_key, delete_key, put_json, wake_site

def mrly_release(batch: Batch) -> Batch:
    batch.released_at = int(time.time())
    put_json(batch_key(batch.design), batch.to_dict())
    delete_key(BATCH_KEY)
    logger.info(f"batch {batch.design} released: {len(batch.cells(USED))} products, {len(batch.cells(DROPPED))} cells dropped")
    wake_site(f"released {batch.design}")
    return batch

if __name__ == "__main__":
    from automator.core.s3 import load_batch
    batch = load_batch()
    if not batch:
        raise SystemExit("no batch in flight")
    mrly_release(batch)
    print(batch.design, "released")
