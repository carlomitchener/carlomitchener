import boto3
import json
import os
from automator.core.api import logger
from automator.core.errors import NoTaskError
from automator.core.models import Task
from automator.core.s3 import archive_task, clear_task
from automator.core.steps import Step

SITE_FUNCTION = os.environ.get("CARLOMITCHENER_SITE_FUNCTION") or "carlomitchener-site"

def wake_site() -> None:
    try:
        boto3.client("lambda").invoke(
            FunctionName=SITE_FUNCTION,
            InvocationType="Event",
            Payload=json.dumps({"source": "automator"}).encode(),
        )
        logger.info(f"woke {SITE_FUNCTION}")
    except Exception as error:
        logger.info(f"{SITE_FUNCTION} wake failed: {error}")

def mrly_complete(task: Task) -> Task:
    task.wipe()
    task.place(Step.ARCHIVE)
    archive_task(task)
    clear_task()
    wake_site()
    raise NoTaskError(task.key)
