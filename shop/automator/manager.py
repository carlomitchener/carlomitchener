import json
import os
from core.amazon import abort_task, load_paths, load_task, save_paths, save_task
from core.config import MODE, MRLYCDN_BUCKET, MRLYSHOP_BUCKET
from core.models import Task
from core.steps import Step
from utils.boto import delete_folder, get_file, get_json, list_objects, put_json, s3_url

from utils.helpers import load_json, save_json

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# TASKS

def delete_all_tasks():
    delete_folder("tasks/", MRLYSHOP_BUCKET)
    print(f"Deleted all items from {MRLYSHOP_BUCKET}/tasks/")

def fetch_task(key: str):
    task = get_json(f"tasks/{key}/{key}.json", MRLYSHOP_BUCKET)
    task = Task.from_dict(task)
    return task

def print_task(key: str):
    task = fetch_task(key)
    print(json.dumps(task.to_dict(), indent=2))

def delete_task(key: str):
    fp = f"tasks/{key}/"
    delete_folder(fp, MRLYSHOP_BUCKET)
    print(f"Deleted {s3_url(fp, MRLYSHOP_BUCKET)}")

def abort_current_task():
    task = load_task()
    abort_task(task)
    print(f"Aborted task {task.key}")

def reset_task(step_name: str):
    step_name = step_name.upper()
    valid = [s.name for s in Step]
    if step_name not in valid:
        print(f"Invalid step: {step_name}. Valid: {', '.join(valid)}")
        return
    task = load_task()
    task.place(Step[step_name])
    save_task(task)
    print(f"Reset task {task.key} to {step_name}")

def upload_local_tasks():
    folder = os.path.join(ROOT, "data/tasks")
    keys = [d for d in os.listdir(folder) if os.path.isdir(os.path.join(folder, d))]
    uploaded = 0
    for key in keys:
        filepath = os.path.join(folder, key, f"{key}.json")
        data = load_json(filepath)
        fp = f"tasks/{key}/{key}.json"
        put_json(fp, data, MRLYSHOP_BUCKET)
        print(f"Uploaded: {s3_url(fp, MRLYSHOP_BUCKET)}")
        uploaded += 1
    print(f"Done! Uploaded {uploaded} tasks to {MRLYSHOP_BUCKET}/tasks/")

def download_printfiles(key: str):
    folder = os.path.join(ROOT, f"data/tasks/{key}")
    if not os.path.exists(folder):
        os.makedirs(folder)
    prefix = f"mrlyshop/tasks/{key}/"
    objects = list_objects(prefix, MRLYCDN_BUCKET)
    count = 0
    for obj in objects:
        s3_key = obj["Key"]
        filename = os.path.basename(s3_key)
        local_path = os.path.join(folder, filename)
        print(f"Downloading {filename}...")
        get_file(s3_key, local_path, MRLYCDN_BUCKET)
        count += 1
    print(f"Downloaded {count} files to {folder}")

# CONFIG

def create_automator_json():
    if MODE == "TEST":
        fp = os.path.join(ROOT, "data/config/automator.json")
        os.makedirs(os.path.dirname(fp), exist_ok=True)
        save_json(fp, {})
        print(f"Created local {fp}")
    if MODE == "PROD":
        key = "config/automator.json"
        put_json(key, {}, MRLYSHOP_BUCKET)
        print(f"Created {s3_url(key, MRLYSHOP_BUCKET)}")

def print_automator_json():
    task = load_task()
    print(json.dumps(task.to_dict(), indent=2))

def save_automator_json_local():
    task = load_task()
    fp = os.path.join(ROOT, "data/config/automator.json")
    os.makedirs(os.path.dirname(fp), exist_ok=True)
    save_json(fp, task.to_dict())
    print(f"Saved local {fp}")

def create_paths_json():
    dictionary = load_json(os.path.join(ROOT, "files/dictionary.json"))
    paths = {product_id: False for product_id in dictionary.keys()}
    save_paths(paths)
    if MODE == "TEST":
        print(f"Created local data/config/paths.json")
    if MODE == "PROD":
        print(f"Created {s3_url('config/paths.json', MRLYSHOP_BUCKET)}")

def paths_info():
    paths = load_paths()
    available = len([p for p in paths.values() if p])
    closed = len([p for p in paths.values() if not p])
    total = len(paths)
    print(f"Open: {available}, Closed: {closed}, Total: {total}")

# BUCKET

def wipe_bucket():
    delete_folder("", MRLYSHOP_BUCKET)

if __name__ == "__main__":
    pass
    print_automator_json()
