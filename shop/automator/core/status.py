import logging
import time
from .api import logger
from .config import LIVE_DAYS
from .models import DROPPED, OPEN, USED, Batch, Task
from .s3 import STATUS_KEY, TASKS_PREFIX, get_json, list_batches, list_objects, load_strikes, put_json

LINES = 300
ERROR_LIMIT = 300

class Journal(logging.Handler):

    def __init__(self):
        super().__init__(level=logging.INFO)
        self.lines: list[str] = []

    def emit(self, record: logging.LogRecord) -> None:
        stamp = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime(record.created))
        self.lines.append(f"{stamp} {record.levelname} {record.getMessage()}")

def attach() -> Journal:
    journal = Journal()
    logger.addHandler(journal)
    return journal

def detach(journal: Journal) -> None:
    logger.removeHandler(journal)

def task_summary(task: Task) -> dict:
    if not task:
        return None
    metadata = dict(task.metadata)
    if metadata.get("failed_error"):
        metadata["failed_error"] = str(metadata["failed_error"])[:ERROR_LIMIT]
    return {
        "key": task.key,
        "step": task.step,
        "design": task.design,
        "product": {"id": task.product.id, "title": task.product.title, "category": task.product.category},
        "created_at": task.created_at,
        "updated_at": task.updated_at,
        "printfiles": len(task.printfiles),
        "mockups": len(task.mockups),
        "variants": len(task.variants),
        "metadata": metadata,
    }

def design_summary(batch: Batch) -> dict:
    if not batch:
        return None
    return {
        "key": batch.design,
        "created_at": batch.created_at,
        "group": batch.group,
        "edition": batch.variation.get("edition"),
        "secondary": batch.paint.get("secondary"),
        "scheme": batch.paint.get("scheme"),
    }

def batch_summary(batch: Batch) -> dict:
    if not batch:
        return None
    return {
        "open": len(batch.cells(OPEN)),
        "used": len(batch.cells(USED)),
        "dropped": len(batch.cells(DROPPED)),
        "tiles": batch.tiles,
        "strikes": load_strikes(),
    }

def live_summary(now: float) -> dict:
    keys = [obj["Key"] for obj in list_objects(TASKS_PREFIX)]
    batches = [batch for batch in list_batches() if batch.released_at]
    cutoff = now - LIVE_DAYS * 86400
    counts = {batch.design: sum(1 for key in keys if key.endswith(f"-{batch.design}.json")) for batch in batches}
    stamps = [batch.released_at for batch in batches]
    return {
        "products": len(keys),
        "batches": len(batches),
        "expiring": sum(counts[batch.design] for batch in batches if batch.released_at < cutoff + 86400),
        "newest": max(stamps) if stamps else None,
        "oldest": min(stamps) if stamps else None,
    }

def previous_log() -> list[str]:
    try:
        return list(get_json(STATUS_KEY).get("log") or [])
    except Exception:
        return []

def write(journal: Journal, task: Task, batch: Batch, seconds: float, error: str = None) -> None:
    now = time.time()
    log = (previous_log() + journal.lines)[-LINES:]
    data = {
        "at": int(now),
        "seconds": round(seconds, 1),
        "error": error,
        "design": design_summary(batch),
        "batch": batch_summary(batch),
        "task": task_summary(task),
        "live": live_summary(now),
        "log": log,
    }
    put_json(STATUS_KEY, data, cache="no-cache")
