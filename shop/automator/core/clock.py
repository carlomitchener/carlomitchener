import math
import time
from .errors import Retry, TaskAborted
from .models import Task

STATE = {"deadline": None}

def start(remaining_ms: int = None) -> None:
    STATE["deadline"] = time.time() + remaining_ms / 1000 if remaining_ms else None

def remaining() -> float:
    if STATE["deadline"] is None:
        return math.inf
    return STATE["deadline"] - time.time()

def wait(task: Task, budget: int, reason: str) -> None:
    now = int(time.time())
    since = task.metadata.setdefault("waiting_since", now)
    waited = now - since
    if waited > budget:
        raise TaskAborted(f"{reason} after {waited} s, budget {budget} s")
    raise Retry(f"{reason}, waited {waited}/{budget} s")
