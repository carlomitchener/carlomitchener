from automator.core.api import shopify_request
from automator.core.errors import Retry, TaskAborted
from automator.core.models import Task
from automator.core.steps import Step

MAX_STATUS_ATTEMPTS = 10

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

def get_status(task: Task) -> list[dict]:
    variables = {"ids": [m.shopify_id for m in task.mockups]}
    result = shopify_request(task, QUERY, variables)
    return [node for node in result["data"]["nodes"] if node]

def retry_files(task: Task) -> None:
    if task.metadata.get("files_retried"):
        raise TaskAborted(f"shopify file FAILED twice for {task.key}")
    task.metadata["files_retried"] = True
    for mockup in task.mockups:
        mockup.shopify_id = None
    task.place(Step.FILES)
    raise Retry(f"Current: {Step.STATUS}. Next: {Step.FILES}")

def check_status(task: Task, files: list[dict]) -> None:
    if any(file["fileStatus"] == "FAILED" for file in files):
        retry_files(task)
    if not all(file["fileStatus"] == "READY" for file in files):
        count = task.metadata.get("status_count", 0) + 1
        task.metadata["status_count"] = count
        if count >= MAX_STATUS_ATTEMPTS:
            raise TaskAborted(f"status_count {count} for task {task.key}")
        raise Retry(f"Current: {Step.STATUS}. Next: {Step.STATUS} ({count}/{MAX_STATUS_ATTEMPTS})")

def mrly_status(task: Task) -> Task:
    files = get_status(task)
    if len(files) != len(task.mockups):
        raise TaskAborted(f"shopify returned {len(files)} of {len(task.mockups)} files")
    check_status(task, files)
    task.place(Step.PRODUCT)
    return task
