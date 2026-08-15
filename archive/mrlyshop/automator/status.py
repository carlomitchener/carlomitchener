from core.errors import Retry
from core.helpers import shopify_request
from core.models import Task
from core.steps import Step

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
    ids = [m.shopify_id for m in task.mockups]
    variables = {"ids": ids}
    result = shopify_request(
        task=task,
        query=QUERY,
        variables=variables
    )
    return result

def check_status(task: Task, result: dict) -> None:
    files = result["data"]["nodes"]
    if any(f["fileStatus"] == "FAILED" for f in files):
        for m in task.mockups:
            m.shopify_id = None
        task.place(Step.FILES)
        raise Retry(f"Current: {Step.STATUS}. Next: {Step.FILES}")
    if not all(f["fileStatus"] == "READY" for f in files):
        raise Retry(f"Current: {Step.STATUS}. Next: {Step.STATUS}")

def mrly_status(task: Task) -> Task:
    result = get_status(task)
    check_status(task, result)
    task.place(Step.PRODUCT)
    return task

def test_status():
    from core.amazon import load_task, save_task
    task = load_task()
    try: task = mrly_status(task); save_task(task)
    except Retry: save_task(task)

if __name__ == "__main__":
    test_status()
