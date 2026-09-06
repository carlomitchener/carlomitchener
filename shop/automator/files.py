from automator.core.api import check_errors, shopify_request
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

def send_batch(task: Task, batch: list[Mockup]) -> list[dict]:
    variables = {"files": [create_file(mockup) for mockup in batch]}
    result = shopify_request(task, MUTATION, variables)
    return check_errors(result, "fileCreate")["files"]

def match(mockup: Mockup, files: list[dict]) -> str:
    for file in files:
        if file.get("alt") == mockup.alt:
            return file["id"]
    for file in files:
        source = (file.get("image") or {}).get("url") or ""
        if mockup.name in source:
            return file["id"]
    raise TaskAborted(f"no shopify file for {mockup.alt}")

def send_files(task: Task) -> Task:
    for start in range(0, len(task.mockups), BATCH):
        batch = task.mockups[start:start + BATCH]
        files = send_batch(task, batch)
        for mockup in batch:
            mockup.shopify_id = match(mockup, files)
    return task

def mrly_files(task: Task) -> Task:
    task = send_files(task)
    task.place(Step.STATUS)
    raise Retry(f"Current: {Step.FILES}. Next: {Step.STATUS}")
