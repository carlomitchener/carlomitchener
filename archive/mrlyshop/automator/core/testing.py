import os
from mrlycloud.helpers import load_json, save_json

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from .errors import NoTaskError
from .models import Task

# CHECK

def local_key_exists(key: str) -> bool:
    return os.path.exists(os.path.join(ROOT, f"data/tasks/{key}/{key}.json"))

# CATALOG

def local_load_product(id: int) -> dict:
    return load_json(os.path.join(ROOT, f"data/products/{id}.json"))

def local_load_paths() -> dict:
    return load_json(os.path.join(ROOT, "data/config/paths.json"))

def local_save_paths(data: dict) -> None:
    save_json(os.path.join(ROOT, "data/config/paths.json"), data, indent=4)

# TASK

def local_load_task() -> Task:
    data = load_json(os.path.join(ROOT, "data/config/automator.json"))
    if not data:
        raise NoTaskError()
    return Task.from_dict(data)

def local_save_task(task: Task):
    save_json(os.path.join(ROOT, "data/config/automator.json"), task.to_dict(), indent=4)

def local_archive_task(task: Task):
    save_json(os.path.join(ROOT, f"data/tasks/{task.key}/{task.key}.json"), task.to_dict(), indent=4)

def local_clear_task():
    save_json(os.path.join(ROOT, "data/config/automator.json"), {}, indent=4)
