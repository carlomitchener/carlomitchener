from automator.core.api import logger, printful_request
from automator.core.clock import wait
from automator.core.config import MOCKUP_BUDGET, MOCKUP_ROUNDS
from automator.core.errors import Retry, TaskAborted
from automator.core.models import Task
from automator.core.steps import Step
from automator.mockup import in_flight, post_batches, unrequested

PRINTFUL_POLL_URL = "v2/mockup-tasks?id="

def fetch_results(task: Task, jobs: list[str]) -> dict[str, dict]:
    result = printful_request(task, "GET", f"{PRINTFUL_POLL_URL}{','.join(jobs)}")
    return {str(data["id"]): data for data in result.get("data") or []}

def parse_result(task: Task, job: str, result: dict) -> None:
    mockups = {m.id: m for m in task.mockups}
    for variant_data in result.get("catalog_variant_mockups") or []:
        for mockup_data in variant_data.get("mockups") or []:
            style_id = mockup_data.get("style_id")
            if style_id not in mockups:
                logger.warning(f"{task.desc} unknown mockup style {style_id} skipped")
                continue
            mockups[style_id].url = mockup_data["mockup_url"]
    empty = [m for m in task.mockups if m.job == job and not m.url]
    if empty:
        logger.warning(f"{task.desc} {len(empty)} mockup styles came back empty: {[m.id for m in empty]}")
        task.mockups = [m for m in task.mockups if m not in empty]

def requeue(task: Task, job: str, data: dict) -> None:
    styles = [m for m in task.mockups if m.job == job]
    reason = data.get("failure_reasons") or data
    for mockup in styles:
        mockup.job = None
        mockup.failures += 1
    dropped = [m for m in styles if m.failures >= MOCKUP_ROUNDS]
    logger.warning(f"{task.desc} mockup task {job} failed, {len(styles) - len(dropped)} styles requeued, {len(dropped)} dropped after {MOCKUP_ROUNDS} failures: {reason}")
    task.mockups = [m for m in task.mockups if m not in dropped]

def settle(task: Task) -> None:
    jobs = in_flight(task)
    if not jobs:
        return
    results = fetch_results(task, jobs)
    for job in jobs:
        data = results.get(job)
        if not data:
            continue
        if data["status"] == "completed":
            parse_result(task, job, data)
        elif data["status"] == "failed":
            requeue(task, job, data)

def mrly_process(task: Task) -> Task:
    settle(task)
    post_batches(task)
    flying, queued = in_flight(task), unrequested(task)
    if flying or queued:
        wait(task, MOCKUP_BUDGET, f"{len(flying)} mockup tasks in flight, {len(queued)} styles queued")
    task.mockups = sorted([m for m in task.mockups if m.url], key=lambda m: m.id)
    if not task.mockups:
        raise TaskAborted(f"printful returned no mockup for {task.key}")
    task.metadata.pop("waiting_since", None)
    task.place(Step.FILES)
    return task

if __name__ == "__main__":
    from automator.core.s3 import load_task, save_task
    task = load_task()
    try:
        task = mrly_process(task)
    except Retry as note:
        print(note)
    save_task(task)
    print(task.key, task.step, len(task.mockups), "mockups")
