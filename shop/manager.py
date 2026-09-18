import json
import sys
from automator.core.api import delete_product, mint_token
from automator.core.errors import NoTaskError
from automator.core.models import Task
from automator.core.s3 import (
    AUTOMATOR_PREFIX,
    BUCKET,
    CDN_PREFIX,
    DESIGN_KEY,
    PATHS_KEY,
    STATUS_KEY,
    STRIKES_KEY,
    TASK_KEY,
    abort_task,
    archive_key,
    cdn_prefix,
    delete_folder,
    delete_key,
    get_json,
    load_design,
    load_paths,
    load_strikes,
    load_task,
    put_json,
    save_paths,
    save_task,
)
from automator.core.steps import Step
from env import SHOP_DIR, gate, load_json, say, verb
import os

VERBS = ["init", "show", "design", "status", "paths", "reset", "abort", "reap", "redo", "wipe"]
COUNTERS = ["failed_at", "failed_error", "failed_count", "files_round", "preview_media", "render_count", "waiting_since"]
CATALOG = os.path.join(SHOP_DIR, "files", "catalog.json")

def all_ids() -> list[int]:
    return [row["id"] for row in load_json(CATALOG)]

def argument(index: int, name: str) -> str:
    if len(sys.argv) <= index or sys.argv[index].startswith("--"):
        raise SystemExit(f"refuse: {name} is required")
    return sys.argv[index]

# INIT

def init():
    ids = all_ids()
    steps = [
        f"put {BUCKET}/{TASK_KEY} = {{}}",
        f"put {BUCKET}/{PATHS_KEY} = {len(ids)} ids, all open",
        f"delete {BUCKET}/{DESIGN_KEY}, the first tick rolls a design",
    ]
    if not gate("manager init", steps): return
    put_json(TASK_KEY, {})
    save_paths({str(id): True for id in ids})
    delete_key(DESIGN_KEY)
    delete_key(STRIKES_KEY)
    say(f"init wrote {TASK_KEY} and {PATHS_KEY} with {len(ids)} ids")

# READ

def show():
    try:
        task = load_task()
    except NoTaskError:
        say("no task in flight")
        return
    say(json.dumps(task.to_dict(), indent=2))

def design():
    found = load_design()
    if not found:
        say("no design yet")
        return
    say(json.dumps(found.to_dict(), indent=2))

def status():
    try:
        data = get_json(STATUS_KEY)
    except NoTaskError:
        say("no status yet")
        return
    log = data.pop("log", [])
    say(json.dumps(data, indent=2))
    for line in log[-40:]: say(line)

def paths():
    data = load_paths()
    open_ids = [id for id, state in data.items() if state is True]
    used = [id for id, state in data.items() if state is False]
    dead = [id for id, state in data.items() if state is None]
    say(f"open {len(open_ids)}, used {len(used)}, quarantined {len(dead)}, total {len(data)}")
    strikes = load_strikes()
    if strikes: say("strikes: " + " ".join(f"{id}x{count}" for id, count in sorted(strikes.items())))
    if not dead: return
    say("quarantined: " + " ".join(sorted(dead)))
    if not gate("manager paths", [f"reopen {len(dead)} quarantined ids in {PATHS_KEY}"]): return
    for id in dead: data[id] = True
    save_paths(data)
    say(f"reopened {len(dead)} ids")

# WRITE

def reset():
    name = argument(2, "step").upper()
    if name not in [step.name for step in Step]:
        raise SystemExit(f"refuse: {name} is not a step")
    task = load_task()
    steps = [
        f"{task.key} {task.step} -> {name.lower()}",
        f"clear {len(COUNTERS)} metadata counters",
    ]
    if not gate("manager reset", steps): return
    task.place(Step[name])
    for counter in COUNTERS: task.metadata.pop(counter, None)
    save_task(task)
    say(f"reset {task.key} to {name.lower()}")

def abort():
    task = load_task()
    steps = [
        f"delete shopify product {task.product.shopify_id} or its files",
        f"delete {BUCKET}/{cdn_prefix(task.key)}",
        f"delete {BUCKET}/{archive_key(task.key)}",
        f"mark {task.product.id} used in {PATHS_KEY}",
    ]
    if not gate("manager abort", steps): return
    mint_token()
    abort_task(task)
    say(f"aborted {task.key}")

def reap():
    key = argument(2, "key")
    task = Task.from_dict(get_json(archive_key(key)))
    steps = [
        f"delete shopify product {task.product.shopify_id}",
        f"delete {BUCKET}/{cdn_prefix(key)}",
        f"delete {BUCKET}/{archive_key(key)}",
    ]
    if not gate("manager reap", steps): return
    if task.product.shopify_id:
        mint_token()
        delete_product(task)
    say(f"deleted {delete_folder(cdn_prefix(key))} product files")
    delete_key(archive_key(key))
    say(f"deleted {archive_key(key)}")

def reopen(id: int) -> None:
    data = load_paths()
    data[str(id)] = True
    save_paths(data)

def redo():
    key = sys.argv[2] if len(sys.argv) > 2 and not sys.argv[2].startswith("--") else None
    task = Task.from_dict(get_json(archive_key(key))) if key else load_task()
    steps = [
        f"{'reap archive' if key else 'abort the task in flight'} {task.key}",
        f"delete shopify product {task.product.shopify_id} or its files, the CDN folder and the archive",
        f"reopen {task.product.id} in {PATHS_KEY} so this round remakes it",
    ]
    if not gate("manager redo", steps): return
    mint_token()
    if key:
        if task.product.shopify_id:
            delete_product(task)
        delete_folder(cdn_prefix(key))
        delete_key(archive_key(key))
    else:
        abort_task(task)
    reopen(task.product.id)
    say(f"redo {task.key}: product {task.product.id} reopened")

def wipe():
    steps = [
        f"delete every object under {BUCKET}/{AUTOMATOR_PREFIX}",
        f"delete every object under {BUCKET}/{CDN_PREFIX}",
        f"delete {BUCKET}/{STATUS_KEY}",
        "shopify products stay; run shopify.py purge for those",
    ]
    if not gate("manager wipe", steps): return
    say(f"deleted {delete_folder(AUTOMATOR_PREFIX)} objects under {AUTOMATOR_PREFIX}")
    say(f"deleted {delete_folder(CDN_PREFIX)} objects under {CDN_PREFIX}")
    delete_key(STATUS_KEY)

ACTIONS = {
    "init": init,
    "show": show,
    "design": design,
    "status": status,
    "paths": paths,
    "reset": reset,
    "abort": abort,
    "reap": reap,
    "redo": redo,
    "wipe": wipe,
}

if __name__ == "__main__":
    ACTIONS[verb(VERBS)]()
