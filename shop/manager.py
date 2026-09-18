import json
import sys
from automator.core.api import mint_token
from automator.core.errors import NoTaskError
from automator.core.models import DROPPED, OPEN, USED, Task
from automator.core.s3 import (
    AUTOMATOR_PREFIX,
    BATCH_KEY,
    BUCKET,
    CDN_PREFIX,
    STATUS_KEY,
    STRIKES_KEY,
    TASK_KEY,
    abort_task,
    archive_exists,
    archive_key,
    batch_key,
    catalog_ids,
    cdn_prefix,
    delete_folder,
    delete_key,
    get_json,
    list_batches,
    load_batch,
    load_strikes,
    load_task,
    put_json,
    remove_product,
    save_batch,
    save_task,
)
from automator.core.steps import Step
from automator.reap import archives, reap_batch
from automator.release import mrly_release
from env import gate, say, verb

VERBS = ["init", "show", "batch", "status", "rows", "reset", "abort", "reap", "redo", "release", "wipe"]
COUNTERS = ["failed_at", "failed_error", "failed_count", "files_round", "render_count", "waiting_since"]

def argument(index: int, name: str) -> str:
    if len(sys.argv) <= index or sys.argv[index].startswith("--"):
        raise SystemExit(f"refuse: {name} is required")
    return sys.argv[index]

def current():
    batch = load_batch()
    if not batch:
        raise SystemExit("refuse: no batch in flight")
    return batch

# INIT

def init():
    ids = catalog_ids()
    steps = [
        f"put {BUCKET}/{TASK_KEY} = {{}}",
        f"delete {BUCKET}/{BATCH_KEY} and {STRIKES_KEY}; the first tick rolls a batch over {len(ids)} catalog products",
    ]
    if not gate("manager init", steps): return
    put_json(TASK_KEY, {})
    delete_key(BATCH_KEY)
    delete_key(STRIKES_KEY)
    say(f"init cleared the task and the batch; {len(ids)} products in {BUCKET}/data/catalog/")

# READ

def show():
    try:
        task = load_task()
    except NoTaskError:
        say("no task in flight")
        return
    say(json.dumps(task.to_dict(), indent=2))

def batch():
    found = load_batch()
    if not found:
        say("no batch in flight")
        return
    data = found.to_dict()
    data.pop("variation")
    say(json.dumps(data, indent=2))

def status():
    try:
        data = get_json(STATUS_KEY)
    except NoTaskError:
        say("no status yet")
        return
    log = data.pop("log", [])
    say(json.dumps(data, indent=2))
    for line in log[-40:]: say(line)

def rows():
    found = current()
    counts = {state: len(found.cells(state)) for state in (OPEN, USED, DROPPED)}
    say(f"batch {found.design}: " + ", ".join(f"{state} {count}" for state, count in counts.items()) + f", rows {len(found.rows)}")
    strikes = load_strikes()
    if strikes: say("strikes: " + " ".join(f"{id}x{count}" for id, count in sorted(strikes.items())))
    dead = sorted({id for id, _ in found.cells(DROPPED)})
    if not dead: return
    say("dropped: " + " ".join(dead))
    if not gate("manager rows", [f"reopen {len(dead)} dropped rows in {BATCH_KEY}"]): return
    for id in dead:
        for primary in found.row(id): found.mark(id, primary, OPEN)
    save_batch(found)
    say(f"reopened {len(dead)} rows")

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
        f"strike product {task.product.id}; reopen its {task.primary} cell, or drop the pair at three strikes",
    ]
    if not gate("manager abort", steps): return
    mint_token()
    abort_task(task)
    say(f"aborted {task.key}")

def reap():
    design = argument(2, "design")
    found = next((one for one in list_batches() if one.design == design), None)
    if not found:
        raise SystemExit(f"refuse: no released batch {design}")
    keys = archives(design)
    steps = [
        f"delete {len(keys)} shopify products, their CDN folders and archives",
        f"delete {BUCKET}/{cdn_prefix(design)}",
        f"delete {BUCKET}/{batch_key(design)}",
    ]
    if not gate("manager reap", steps): return
    mint_token()
    reap_batch(found)
    say(f"reaped batch {design}, {len(keys)} products")

def reopen(task: Task) -> None:
    found = current()
    if found.design != task.design:
        raise SystemExit(f"refuse: {task.key} is not in batch {found.design}")
    found.mark(task.product.id, task.primary, OPEN)
    row = found.row(task.product.id)
    for primary, state in row.items():
        if state == DROPPED and not archive_exists(task.key_for(primary)):
            row[primary] = OPEN
    save_batch(found)

def redo():
    key = sys.argv[2] if len(sys.argv) > 2 and not sys.argv[2].startswith("--") else None
    task = Task.from_dict(get_json(archive_key(key))) if key else load_task()
    steps = [
        f"{'reap archive' if key else 'abort the task in flight'} {task.key}",
        f"delete shopify product {task.product.shopify_id} or its files, the CDN folder and the archive",
        f"reopen {task.product.id} {task.primary} in {BATCH_KEY} so this batch remakes it",
    ]
    if not gate("manager redo", steps): return
    mint_token()
    if key:
        remove_product(task)
    else:
        abort_task(task)
    reopen(task)
    say(f"redo {task.key}: product {task.product.id} {task.primary} reopened")

def release():
    found = current()
    open_cells = len(found.cells(OPEN))
    steps = [
        f"move {BUCKET}/{BATCH_KEY} to {batch_key(found.design)} with {open_cells} cells still open",
        "wake carlomitchener-site; the next tick rolls a new batch",
    ]
    if not gate("manager release", steps): return
    mrly_release(found)
    say(f"released batch {found.design}")

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
    "batch": batch,
    "status": status,
    "rows": rows,
    "reset": reset,
    "abort": abort,
    "reap": reap,
    "redo": redo,
    "release": release,
    "wipe": wipe,
}

if __name__ == "__main__":
    ACTIONS[verb(VERBS)]()
