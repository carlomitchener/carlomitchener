from automator import complete
from automator import create
from automator import files
from automator import generate
from automator import mockup
from automator import ping
from automator import process
from automator import product
from automator import publish
from automator import status
from automator import sync
from automator.core.api import logger, mint_token
from automator.core.errors import NoTaskError, Retry, TaskAborted
from automator.core.models import Task
from automator.core.s3 import abort_task, load_task, save_task
from automator.core.steps import Step

MAX_FAILURES = 3

STEPS = {
    Step.GENERATE: generate.mrly_generate,
    Step.MOCKUP: mockup.mrly_mockup,
    Step.PROCESS: process.mrly_process,
    Step.FILES: files.mrly_files,
    Step.STATUS: status.mrly_status,
    Step.PRODUCT: product.mrly_product,
    Step.PING: ping.mrly_ping,
    Step.SYNC: sync.mrly_sync,
    Step.PUBLISH: publish.mrly_publish,
    Step.COMPLETE: complete.mrly_complete,
}

def start() -> Task:
    try:
        task = load_task()
        logger.info(f"{task.desc} loaded task at Step.{task.step.upper()}")
        return task
    except NoTaskError:
        pass
    task = create.mrly_create()
    logger.info(f"{task.desc} created task on product {task.product.id}")
    return task

def recover(task: Task) -> Task:
    count = task.metadata.get("failed_count", 0) + 1
    task.metadata["failed_count"] = count
    if count >= MAX_FAILURES:
        logger.info(f"{task.desc} failed_count {count}, aborting")
        abort_task(task)
        return None
    step = task.metadata.get("failed_at") or Step.GENERATE.value
    task.place(Step(step))
    save_task(task)
    logger.info(f"{task.desc} FAILED recovery {count}/{MAX_FAILURES}, back to Step.{step.upper()}")
    return None

def run() -> None:
    try:
        task = start()
    except NoTaskError as error:
        logger.info(f"nothing to do: {error}")
        return
    while True:
        step = Step(task.step)
        if step == Step.FAILED:
            recover(task)
            break
        try:
            logger.info(f"{task.desc} executing Step.{task.step.upper()}")
            task = STEPS[step](task)
            save_task(task)
            continue
        except Retry as error:
            logger.info(f"{task.desc} retry: {error}")
            save_task(task)
            break
        except TaskAborted as error:
            logger.info(f"{task.desc} aborted: {error}")
            abort_task(task)
            break
        except NoTaskError:
            logger.info(f"{task.desc} completed")
            break
        except Exception as error:
            logger.info(f"{task.desc} error at Step.{task.step.upper()}: {error}")
            task.metadata["failed_at"] = task.step
            task.metadata["failed_error"] = str(error)
            task.place(Step.FAILED)
            save_task(task)
            raise

def handler(event, context):
    mint_token()
    run()
