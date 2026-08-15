import complete
import create
import files
import generate
import mockup
import ping
import process
import product
import publish
import status
import sync
from core.amazon import abort_task, load_task, save_task
from core.errors import NoTaskError, Retry, TaskAborted, TaskFailed
from core.helpers import logger
from core.steps import Step

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

def run():
    try:
        task = load_task()
        logger.info(f"{task.desc} Loaded task {task.key}")
    except NoTaskError:
        task = create.mrly_create()
        logger.info(f"{task.desc} Created task {task.key} ({task.product.title})")
    while True:
        step = Step(task.step)
        if step == Step.FAILED:
            raise TaskFailed(f"Task {task.key} is in FAILED state. Exiting.")
        func = STEPS[step]
        try:
            logger.info(f"{task.desc} Executing Step.{task.step.upper()}")
            task = func(task)
            save_task(task)
            continue
        except Retry as e:
            logger.info(f"{task.desc} Retry requested. {e}. Saving and exiting.")
            save_task(task)
            break
        except TaskAborted as e:
            logger.info(f"{task.desc} Task aborted. {e}")
            abort_task(task)
            break
        except NoTaskError:
            logger.info(f"{task.desc} Task completed. Exiting.")
            break
        except Exception as e:
            logger.info(f"{task.desc} Error at Step.{task.step.upper()}: {e}")
            task.metadata["failed_at"] = task.step
            task.metadata["failed_error"] = str(e)
            task.place(Step.FAILED)
            save_task(task)
            raise e

def handler(event, context):
    run()

def loop():
    import time
    delay = 10
    while True:
        run()
        print(f"Sleeping {delay} seconds...")
        time.sleep(delay)

if __name__ == "__main__":
    run()
