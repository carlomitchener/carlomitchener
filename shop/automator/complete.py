from automator.core.errors import NoTaskError
from automator.core.models import Task
from automator.core.s3 import archive_task, clear_task, wake_site
from automator.core.steps import Step

def mrly_complete(task: Task) -> Task:
    task.wipe()
    task.place(Step.ARCHIVE)
    archive_task(task)
    clear_task()
    wake_site(f"completed {task.key}")
    raise NoTaskError(task.key)

if __name__ == "__main__":
    from automator.core.s3 import load_task
    try:
        mrly_complete(load_task())
    except NoTaskError as key:
        print("archived", key)
