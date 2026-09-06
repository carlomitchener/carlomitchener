from automator.core.api import printful_request
from automator.core.errors import Retry, TaskAborted
from automator.core.models import Task
from automator.core.steps import Step

PRINTFUL_POLL_URL = "v2/mockup-tasks?id="
MAX_PENDING_ATTEMPTS = 10

def count_attempt(task: Task) -> int:
    count = task.metadata.get("mockup_pending_count", 0) + 1
    task.metadata["mockup_pending_count"] = count
    if count >= MAX_PENDING_ATTEMPTS:
        raise TaskAborted(f"mockup_pending_count {count} for task {task.key}")
    return count

def fetch_result(task: Task) -> dict:
    generator_id = task.metadata["mockup_generator_id"]
    result = printful_request(task, "GET", f"{PRINTFUL_POLL_URL}{generator_id}")
    if not result.get("data"):
        count = count_attempt(task)
        raise Retry(f"Current: {Step.PROCESS}. Next: {Step.PROCESS} (empty {count}/{MAX_PENDING_ATTEMPTS})")
    data = result["data"][0]
    status = data["status"]
    if status == "completed":
        return data
    if status == "failed":
        raise TaskAborted(f"printful mockup task failed for {task.key}")
    count = count_attempt(task)
    raise Retry(f"Current: {Step.PROCESS}. Next: {Step.PROCESS} ({status} {count}/{MAX_PENDING_ATTEMPTS})")

def parse_result(task: Task, result: dict) -> Task:
    mockups = {m.id: m for m in task.mockups}
    for variant_data in result["catalog_variant_mockups"]:
        for mockup_data in variant_data["mockups"]:
            style_id = mockup_data["style_id"]
            if style_id not in mockups:
                raise TaskAborted(f"unknown mockup style {style_id} for {task.key}")
            mockups[style_id].url = mockup_data["mockup_url"]
    return task

def mrly_process(task: Task) -> Task:
    result = fetch_result(task)
    task = parse_result(task, result)
    task.mockups = [m for m in task.mockups if m.url]
    task.mockups = sorted(task.mockups, key=lambda m: (m.is_tile, m.id))
    task.place(Step.FILES)
    return task
