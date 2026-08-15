from core.errors import Retry
from core.helpers import shopify_request
from core.models import Task
from core.steps import Step

MUTATION = """
mutation fileCreate($files: [FileCreateInput!]!) {
    fileCreate(files: $files) {
        files {
            alt
            fileStatus
            id
        }
        userErrors {
            field
            message
        }
    }
}
"""

def create_files(task: Task) -> list[dict]:
    return [
        {
            "alt": mockup.alt,
            "contentType": "IMAGE",
            "duplicateResolutionMode": "REPLACE",
            "filename": f"{mockup.name}.{mockup.extension}",
            "originalSource": mockup.url
        }
        for mockup in task.mockups
    ]

def send_files(task: Task) -> dict:
    variables = {"files": create_files(task)}
    result = shopify_request(
        task=task,
        query=MUTATION,
        variables=variables
    )
    return result

def parse_result(task: Task, result: dict) -> Task:
    files = result["data"]["fileCreate"]["files"]
    shopify_ids = {f["alt"]: f["id"] for f in files}
    for mockup in task.mockups:
        mockup.shopify_id = shopify_ids[mockup.alt]
    return task

def mrly_files(task: Task) -> Task:
    result = send_files(task)
    task = parse_result(task, result)
    task.place(Step.STATUS)
    raise Retry(f"Current: {Step.FILES}. Next: {Step.STATUS}")

def test_files():
    from core.amazon import load_task, save_task
    task = load_task()
    try: task = mrly_files(task)
    except Retry: save_task(task)

if __name__ == "__main__":
    test_files()
