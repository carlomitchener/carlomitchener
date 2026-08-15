from core.amazon import archive_task, clear_task
from core.errors import NoTaskError
from core.models import Task
from core.steps import Step

def mrly_complete(task: Task) -> Task:
    task.wipe()
    task.place(Step.ARCHIVE)
    archive_task(task)
    clear_task()
    raise NoTaskError()

def test_complete():
    from core.amazon import load_task
    task = load_task()
    try: mrly_complete(task)
    except NoTaskError: print("Task completed!")

if __name__ == "__main__":
    test_complete()
