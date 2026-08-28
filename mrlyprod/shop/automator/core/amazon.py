import time
from utils.boto import (
    s3_url,
    put_json,
    get_json,
    put_folder,
    put_jpg,
    put_png,
    put_webp,
    delete_object,
    delete_folder,
    list_objects,
    get_file,
    key_exists,
)
from .config import (
    MODE,
    MRLYCDN_BUCKET,
    MRLYSHOP_BUCKET
)
from .errors import NoTaskError
from .models import Task
from .testing import (
    local_key_exists,
    local_load_product,
    local_load_paths,
    local_save_paths,
    local_load_task,
    local_save_task,
    local_archive_task,
    local_clear_task
)

# KEYS

def folder_exists(key: str) -> bool:
    return key_exists(f"{key}/", MRLYSHOP_BUCKET)

def task_exists(key: str) -> bool:
    if MODE == "TEST":
        return local_key_exists(key)
    return key_exists(f"tasks/{key}/{key}.json", MRLYSHOP_BUCKET)

# CATALOG

def load_product(id: int) -> dict:
    if MODE == "TEST":
        return local_load_product(id)
    return get_json(f"products/{id}.json", MRLYSHOP_BUCKET)

def load_paths() -> dict:
    if MODE == "TEST":
        return local_load_paths()
    return get_json("config/paths.json", MRLYSHOP_BUCKET)

def save_paths(data: dict) -> None:
    if MODE == "TEST":
        return local_save_paths(data)
    put_json("config/paths.json", data, MRLYSHOP_BUCKET)

# TASK

def load_task() -> Task:
    if MODE == "TEST":
        return local_load_task()
    data = get_json("config/automator.json", MRLYSHOP_BUCKET)
    if not data:
        raise NoTaskError()
    return Task.from_dict(data)

def save_task(task: Task):
    task.updated_at = int(time.time())
    if MODE == "TEST":
        return local_save_task(task)
    put_json("config/automator.json", task.to_dict(), MRLYSHOP_BUCKET)

def archive_task(task: Task):
    if MODE == "TEST":
        return local_archive_task(task)
    put_json(f"tasks/{task.key}/{task.key}.json", task.to_dict(), MRLYSHOP_BUCKET)

def clear_task():
    if MODE == "TEST":
        return local_clear_task()
    put_json("config/automator.json", {}, MRLYSHOP_BUCKET)

def abort_task(task: Task):
    paths = load_paths()
    paths[str(task.product.id)] = True
    save_paths(paths)
    delete_folder(f"tasks/{task.key}/", MRLYSHOP_BUCKET)
    delete_folder(f"mrlyshop/tasks/{task.key}/", MRLYCDN_BUCKET)
    clear_task()
