from automator.core.errors import NoTaskError
from automator.core.models import Task
from automator.core.s3 import archive_task, clear_task
from automator.core.steps import Step

def mrly_complete(task: Task) -> Task:
    task.wipe()
    task.place(Step.ARCHIVE)
    archive_task(task)
    clear_task()
    raise NoTaskError(task.key)
