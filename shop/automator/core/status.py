import logging
import time
from .api import logger
from .config import LIVE_DAYS
from .errors import NoTaskError
from .models import Design, Task
from .s3 import STATUS_KEY, TASKS_PREFIX, get_json, list_objects, load_paths, put_json

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

def design_summary(design: Design) -> dict:
    if not design:
        return None
    return {
        "key": design.key,
        "created_at": design.created_at,
        "group": design.group,
        "edition": design.variation.get("edition"),
        "primary": design.paint.get("primary"),
        "secondary": design.paint.get("secondary"),
        "scheme": design.paint.get("scheme"),
    }

def paths_summary() -> dict:
    try:
        paths = load_paths()
    except NoTaskError:
        return None
    return {
        "open": sum(1 for state in paths.values() if state is True),
        "used": sum(1 for state in paths.values() if state is False),
        "quarantined": sum(1 for state in paths.values() if state is None),
    }

def live_summary(now: float) -> dict:
    objects = list_objects(TASKS_PREFIX)
    cutoff = now - LIVE_DAYS * 86400
    stamps = [obj["LastModified"].timestamp() for obj in objects]
    return {
        "products": len(objects),
        "expiring": sum(1 for stamp in stamps if stamp < cutoff + 86400),
        "newest": int(max(stamps)) if stamps else None,
        "oldest": int(min(stamps)) if stamps else None,
    }

def previous_log() -> list[str]:
    try:
        return list(get_json(STATUS_KEY).get("log") or [])
    except Exception:
        return []

def write(journal: Journal, task: Task, design: Design, seconds: float, error: str = None) -> None:
    now = time.time()
    log = (previous_log() + journal.lines)[-LINES:]
    data = {
        "at": int(now),
        "seconds": round(seconds, 1),
        "error": error,
        "design": design_summary(design),
        "task": task_summary(task),
        "paths": paths_summary(),
        "live": live_summary(now),
        "log": log,
    }
    put_json(STATUS_KEY, data, cache="no-cache")
