import time
from automator import complete
from automator import create
from automator import files
from automator import generate
from automator import mockup
from automator import ping
from automator import preview
from automator import process
from automator import product
from automator import publish
from automator import reap
from automator import status as status_step
from automator import sync
from automator.core import clock
from automator.core import status
from automator.core.api import logger, mint_token
from automator.core.config import MAX_FAILURES, TICK_RESERVE
from automator.core.errors import NoTaskError, Retry, TaskAborted
from automator.core.models import Task
from automator.core.s3 import abort_task, load_design, load_task, save_task
from automator.core.steps import Step

STEPS = {
    Step.GENERATE: generate.mrly_generate,
    Step.MOCKUP: mockup.mrly_mockup,
    Step.PROCESS: process.mrly_process,
    Step.FILES: files.mrly_files,
    Step.STATUS: status_step.mrly_status,
    Step.PRODUCT: product.mrly_product,
    Step.PING: ping.mrly_ping,
    Step.SYNC: sync.mrly_sync,
    Step.PREVIEW: preview.mrly_preview,
    Step.PUBLISH: publish.mrly_publish,
    Step.COMPLETE: complete.mrly_complete,
    Step.ARCHIVE: complete.mrly_complete,
}

def start() -> Task:
    try:
        task = load_task()
        logger.info(f"{task.desc} loaded at {task.step}")
        return task
    except NoTaskError:
        pass
    task = create.mrly_create()
    logger.info(f"{task.desc} created on product {task.product.id}, design {task.design}")
    return task

def recover(task: Task) -> None:
    count = task.metadata.get("failed_count", 0) + 1
    task.metadata["failed_count"] = count
    step = task.metadata.get("failed_at") or Step.GENERATE.value
    if count >= MAX_FAILURES:
        logger.error(f"{task.desc} failed {count} times at {step}, aborting")
        abort_task(task)
        return
    task.place(Step(step))
    save_task(task)
    logger.warning(f"{task.desc} recovery {count}/{MAX_FAILURES}, back to {step}")

def settle(task: Task, before: str) -> None:
    if task.step != before:
        task.metadata.pop("failed_count", None)
        task.metadata.pop("failed_at", None)
        task.metadata.pop("failed_error", None)

def run() -> Task:
    try:
        reap.mrly_reap()
    except Exception as error:
        logger.error(f"reap error: {error}", exc_info=True)
    try:
        task = start()
    except NoTaskError as error:
        logger.info(f"nothing to do: {error}")
        return None
    while True:
        if clock.remaining() < TICK_RESERVE:
            logger.warning(f"{task.desc} tick reserve reached before {task.step}")
            break
        step = Step(task.step)
        if step == Step.FAILED:
            recover(task)
            break
        before = task.step
        try:
            started = time.time()
            logger.info(f"{task.desc} executing {task.step}")
            task = STEPS[step](task)
            settle(task, before)
            save_task(task)
            logger.info(f"{task.desc} {before} done in {time.time() - started:.1f} s")
            continue
        except Retry as note:
            settle(task, before)
            save_task(task)
            logger.info(f"{task.desc} {before} yields after {time.time() - started:.1f} s: {note}")
            break
        except TaskAborted as error:
            logger.error(f"{task.desc} aborted at {before}: {error}")
            task.metadata["failed_error"] = str(error)
            abort_task(task)
            break
        except NoTaskError:
            logger.info(f"{task.desc} completed")
            break
        except Exception as error:
            logger.error(f"{task.desc} error at {before}: {error}", exc_info=True)
            task.metadata["failed_at"] = before
            task.metadata["failed_error"] = str(error)
            task.place(Step.FAILED)
            save_task(task)
            raise
    return task

def handler(event, context):
    clock.start(context.get_remaining_time_in_millis() if context else None)
    started = time.time()
    journal = status.attach()
    task = None
    error = None
    try:
        mint_token()
        task = run()
    except Exception as caught:
        error = f"{type(caught).__name__}: {caught}"
        raise
    finally:
        try:
            current = None
            try:
                current = load_task()
            except NoTaskError:
                pass
            status.write(journal, current, load_design(), time.time() - started, error)
        except Exception as caught:
            logger.error(f"status write failed: {caught}")
        status.detach(journal)

if __name__ == "__main__":
    handler({}, None)
