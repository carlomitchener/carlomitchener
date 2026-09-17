from automator.core.api import logger, printful_request
from automator.core.clock import wait
from automator.core.config import MOCKUP_BUDGET
from automator.core.errors import TaskAborted
from automator.core.models import Task
from automator.core.steps import Step

PRINTFUL_POLL_URL = "v2/mockup-tasks?id="

def fetch_result(task: Task) -> dict:
    generator_id = task.metadata["mockup_generator_id"]
    result = printful_request(task, "GET", f"{PRINTFUL_POLL_URL}{generator_id}")
    if not result.get("data"):
        wait(task, MOCKUP_BUDGET, "mockup task not listed")
    data = result["data"][0]
    status = data["status"]
    if status == "completed":
        return data
    if status == "failed":
        raise TaskAborted(f"printful mockup task failed: {data.get('failure_reasons') or data}")
    wait(task, MOCKUP_BUDGET, f"mockup task {status}")

def parse_result(task: Task, result: dict) -> Task:
    mockups = {m.id: m for m in task.mockups}
    for variant_data in result.get("catalog_variant_mockups") or []:
        for mockup_data in variant_data.get("mockups") or []:
            style_id = mockup_data.get("style_id")
            if style_id not in mockups:
                logger.warning(f"{task.desc} unknown mockup style {style_id} skipped")
                continue
            mockups[style_id].url = mockup_data["mockup_url"]
    return task

def mrly_process(task: Task) -> Task:
    result = fetch_result(task)
    task = parse_result(task, result)
    missing = [m for m in task.mockups if not m.url]
    if missing:
        logger.warning(f"{task.desc} {len(missing)} mockup styles came back empty: {[m.id for m in missing]}")
    task.mockups = sorted([m for m in task.mockups if m.url], key=lambda m: m.id)
    if not task.mockups:
        raise TaskAborted(f"printful returned no mockup for {task.key}")
    task.metadata.pop("waiting_since", None)
    task.place(Step.FILES)
    return task

if __name__ == "__main__":
    from automator.core.s3 import load_task, save_task
    task = load_task()
    save_task(mrly_process(task))
    print(task.key, task.step, len(task.mockups), "mockups")
