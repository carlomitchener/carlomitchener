import json
import time
from automator.core.api import clip, logger, shopify_request
from automator.core.config import FILE_ROUNDS
from automator.core.errors import Retry, TaskAborted
from automator.core.models import Mockup, Task
from automator.core.steps import Step

BATCH = 25

MUTATION = """
mutation fileCreate($files: [FileCreateInput!]!) {
    fileCreate(files: $files) {
        files {
            alt
            fileStatus
            id
            ... on MediaImage {
                image {
                    url
                }
            }
        }
        userErrors {
            field
            message
        }
    }
}
"""

def filename(mockup: Mockup) -> str:
    return f"{mockup.name}.{mockup.extension}"

def create_file(mockup: Mockup) -> dict:
    return {
        "alt": mockup.alt,
        "contentType": "IMAGE",
        "duplicateResolutionMode": "REPLACE",
        "filename": filename(mockup),
        "originalSource": mockup.url,
    }

def pending(task: Task) -> list[Mockup]:
    return [m for m in task.mockups if not m.shopify_id]

def send_batch(task: Task, batch: list[Mockup]) -> list[dict]:
    variables = {"files": [create_file(mockup) for mockup in batch]}
    result = shopify_request(task, MUTATION, variables)
    data = result["data"]["fileCreate"]
    if data["userErrors"]:
        logger.warning(f"{task.desc} fileCreate userErrors {clip(json.dumps(data['userErrors']))}")
    return data.get("files") or []

def match(mockup: Mockup, files: list[dict]) -> str:
    for file in files:
        if file.get("alt") == mockup.alt:
            return file["id"]
    for file in files:
        source = (file.get("image") or {}).get("url") or ""
        if mockup.name in source:
            return file["id"]
    return None

def mrly_files(task: Task) -> Task:
    round = task.metadata.get("files_round", 0) + 1
    task.metadata["files_round"] = round
    if round > FILE_ROUNDS:
        raise TaskAborted(f"files round {round} for task {task.key}")
    todo = pending(task)
    for start in range(0, len(todo), BATCH):
        batch = todo[start:start + BATCH]
        files = send_batch(task, batch)
        for mockup in batch:
            mockup.shopify_id = match(mockup, files)
    still = pending(task)
    if still:
        logger.warning(f"{task.desc} round {round}: {len(still)} of {len(todo)} files not created")
    task.metadata["waiting_since"] = int(time.time())
    task.place(Step.STATUS)
    raise Retry(f"round {round}: {len(todo) - len(still)} files requested")

if __name__ == "__main__":
    from automator.core.api import mint_token
    from automator.core.s3 import load_task, save_task
    mint_token()
    task = load_task()
    try:
        mrly_files(task)
    except Retry as note:
        print(note)
    save_task(task)
