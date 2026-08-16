from core.errors import Retry, TaskAborted
from core.helpers import printful_request
from core.models import Task
from core.steps import Step

PRINTFUL_POLL_URL = "v2/mockup-tasks?id="
MAX_PENDING_ATTEMPTS = 10

def fetch_result(task: Task) -> dict:
    mockup_generator_id = task.metadata["mockup_generator_id"]
    result = printful_request(
        task=task,
        method="GET",
        url=f"{PRINTFUL_POLL_URL}{mockup_generator_id}"
    )
    if not result:
        raise Retry(f"Current: {Step.PROCESS}. Next: {Step.PROCESS}")
    data = result["data"][0]
    status = data["status"]
    if status == "completed":
        return data
    if status == "pending":
        count = task.metadata.get("mockup_pending_count", 0) + 1
        task.metadata["mockup_pending_count"] = count
        if count >= MAX_PENDING_ATTEMPTS:
            raise TaskAborted(f"Mockup stuck in pending after {count} attempts for task {task.key}")
        raise Retry(f"Current: {Step.PROCESS}. Next: {Step.PROCESS} (pending {count}/{MAX_PENDING_ATTEMPTS})")
    if status == "failed":
        raise TaskAborted(f"Printful mockup task failed for task {task.key}")

def parse_result(task: Task, result: dict) -> Task:
    mockup_map = {m.id: m for m in task.mockups}
    for variant_data in result["catalog_variant_mockups"]:
        for mockup_data in variant_data["mockups"]:
            style_id = mockup_data["style_id"]
            mockup = mockup_map[style_id]
            mockup.url = mockup_data["mockup_url"]
    return task

def mrly_process(task: Task) -> Task:
    result = fetch_result(task)
    task = parse_result(task, result)
    task.mockups = [m for m in task.mockups if m.url]
    task.mockups = sorted(task.mockups, key=lambda m: m.id)
    task.place(Step.FILES)
    return task

def test_process():
    from core.amazon import load_task, save_task
    task = load_task()
    task = mrly_process(task)
    save_task(task)

if __name__ == "__main__":
    test_process()
