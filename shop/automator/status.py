from automator.core.api import logger, shopify_request
from automator.core.clock import wait
from automator.core.config import FILE_ROUNDS, STATUS_BUDGET
from automator.core.errors import Retry, TaskAborted
from automator.core.models import Task
from automator.core.steps import Step

QUERY = """
query checkFiles($ids: [ID!]!) {
    nodes(ids: $ids) {
        ... on MediaImage {
            alt
            fileStatus
            id
        }
    }
}
"""

def get_status(task: Task) -> dict:
    ids = [m.shopify_id for m in task.mockups if m.shopify_id]
    if not ids:
        return {}
    result = shopify_request(task, QUERY, {"ids": ids})
    return {node["id"]: node["fileStatus"] for node in result["data"]["nodes"] if node}

def mrly_status(task: Task) -> Task:
    found = get_status(task)
    failed = [m for m in task.mockups if m.shopify_id and found.get(m.shopify_id) in (None, "FAILED")]
    for mockup in failed:
        mockup.shopify_id = None
    if failed:
        logger.warning(f"{task.desc} {len(failed)} files failed: {[m.alt for m in failed]}")
    missing = [m for m in task.mockups if not m.shopify_id]
    if missing:
        if task.metadata.get("files_round", 0) < FILE_ROUNDS:
            task.place(Step.FILES)
            raise Retry(f"{len(missing)} files to resend")
        logger.warning(f"{task.desc} dropped {len(missing)} mockups after {FILE_ROUNDS} rounds: {[m.alt for m in missing]}")
        task.mockups = [m for m in task.mockups if m.shopify_id]
        if not task.mockups:
            raise TaskAborted(f"no shopify file survived for {task.key}")
    ready = [m for m in task.mockups if found.get(m.shopify_id) == "READY"]
    if len(ready) < len(task.mockups):
        wait(task, STATUS_BUDGET, f"{len(task.mockups) - len(ready)} files processing")
    task.metadata.pop("waiting_since", None)
    task.place(Step.PRODUCT)
    return task

if __name__ == "__main__":
    from automator.core.api import mint_token
    from automator.core.s3 import load_task, save_task
    mint_token()
    task = load_task()
    try:
        task = mrly_status(task)
    except Retry as note:
        print(note)
    save_task(task)
    print(task.key, task.step)
