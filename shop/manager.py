import json
import sys
from automator.core.api import delete_product, mint_token
from automator.core.errors import NoTaskError
from automator.core.models import Task
from automator.core.s3 import (
    AUTOMATOR_KEY,
    BUCKET,
    PATHS_KEY,
    SITE_PREFIX,
    abort_task,
    art_prefix,
    delete_folder,
    get_json,
    load_paths,
    load_task,
    put_json,
    save_paths,
    save_task,
    task_key,
    task_prefix,
)
from automator.core.steps import Step
from catalog.helpers import all_ids
from env import gate, say, verb

VERBS = ["init", "show", "paths", "reset", "abort", "reap", "wipe"]
COUNTERS = [
    "failed_at",
    "failed_error",
    "failed_count",
    "files_retried",
    "mockup_pending_count",
    "ping_count",
    "render_count",
    "status_count",
]
DATA_PREFIX = "data/"
ART_PREFIX = f"{SITE_PREFIX}art/"

def argument(index: int, name: str) -> str:
    if len(sys.argv) <= index or sys.argv[index].startswith("--"):
        raise SystemExit(f"refuse: {name} is required")
    return sys.argv[index]

# INIT

def init():
    ids = all_ids()
    steps = [
        f"put {BUCKET}/{AUTOMATOR_KEY} = {{}}",
        f"put {BUCKET}/{PATHS_KEY} = {len(ids)} ids, all open",
    ]
    if not gate("manager init", steps): return
    put_json(AUTOMATOR_KEY, {})
    save_paths({str(id): True for id in ids})
    say(f"init wrote {AUTOMATOR_KEY} and {PATHS_KEY} with {len(ids)} ids")

# READ

def show():
    try:
        task = load_task()
    except NoTaskError:
        say("no task in flight")
        return
    say(json.dumps(task.to_dict(), indent=2))

def paths():
    data = load_paths()
    open_ids = [id for id, state in data.items() if state is True]
    used = [id for id, state in data.items() if state is False]
    dead = [id for id, state in data.items() if state is None]
    say(f"open {len(open_ids)}, used {len(used)}, quarantined {len(dead)}, total {len(data)}")
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
        f"delete shopify product {task.product.shopify_id}",
        f"delete {BUCKET}/{task_prefix(task.key)}",
        f"delete {BUCKET}/{art_prefix(task.key)}",
        f"quarantine {task.product.id} in {PATHS_KEY}",
    ]
    if not gate("manager abort", steps): return
    mint_token()
    abort_task(task)
    say(f"aborted {task.key}")

def reap():
    key = argument(2, "key")
    task = Task.from_dict(get_json(task_key(key)))
    steps = [
        f"delete shopify product {task.product.shopify_id}",
        f"delete {BUCKET}/{art_prefix(key)}",
        f"delete {BUCKET}/{task_prefix(key)}",
    ]
    if not gate("manager reap", steps): return
    if task.product.shopify_id:
        mint_token()
        delete_product(task)
    say(f"deleted {delete_folder(art_prefix(key))} art objects")
    say(f"deleted {delete_folder(task_prefix(key))} task objects")

def wipe():
    steps = [
        f"delete every object under {BUCKET}/{DATA_PREFIX}",
        f"delete every object under {BUCKET}/{ART_PREFIX}",
    ]
    if not gate("manager wipe", steps): return
    say(f"deleted {delete_folder(DATA_PREFIX)} objects under {DATA_PREFIX}")
    say(f"deleted {delete_folder(ART_PREFIX)} objects under {ART_PREFIX}")

ACTIONS = {
    "init": init,
    "show": show,
    "paths": paths,
    "reset": reset,
    "abort": abort,
    "reap": reap,
    "wipe": wipe,
}

if __name__ == "__main__":
    ACTIONS[verb(VERBS)]()
