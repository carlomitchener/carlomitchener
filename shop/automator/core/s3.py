import boto3
import json
import time
from botocore.exceptions import ClientError
from .api import delete_files, delete_product, logger
from .config import CARLOMITCHENER_BUCKET, MAX_STRIKES, SITE_FUNCTION, SITE_URL
from .errors import NoTaskError, TaskAborted
from .models import OPEN, Batch, Task

s3 = boto3.client("s3")
lam = boto3.client("lambda")

BUCKET = CARLOMITCHENER_BUCKET
AUTOMATOR_PREFIX = "data/automator/"
BATCH_KEY = f"{AUTOMATOR_PREFIX}batch.json"
TASK_KEY = f"{AUTOMATOR_PREFIX}task.json"
STRIKES_KEY = f"{AUTOMATOR_PREFIX}strikes.json"
TASKS_PREFIX = f"{AUTOMATOR_PREFIX}tasks/"
BATCHES_PREFIX = f"{AUTOMATOR_PREFIX}batches/"
CATALOG_PREFIX = "data/catalog/"
SITE_PREFIX = "site/"
CDN_PREFIX = f"{SITE_PREFIX}cdn/printful/"
STATUS_KEY = f"{SITE_PREFIX}status/automator.json"

# KEYS

def catalog_key(id: int) -> str:
    return f"{CATALOG_PREFIX}{id}.json"

def archive_key(key: str) -> str:
    return f"{TASKS_PREFIX}{key}.json"

def batch_key(design: str) -> str:
    return f"{BATCHES_PREFIX}{design}.json"

def cdn_prefix(key: str) -> str:
    return f"{CDN_PREFIX}{key}/"

def cdn_key(key: str, name: str) -> str:
    return f"{CDN_PREFIX}{key}/{name}.png"

def s3_url(key: str) -> str:
    if key.startswith(SITE_PREFIX):
        key = key[len(SITE_PREFIX):]
    return f"{SITE_URL}/{key}"

# OBJECTS

def put_json(key: str, data, cache: str = None) -> None:
    extra = {"CacheControl": cache} if cache else {}
    s3.put_object(
        Bucket=BUCKET,
        Key=key,
        Body=json.dumps(data),
        ContentType="application/json",
        **extra,
    )

def get_json(key: str) -> dict:
    try:
        response = s3.get_object(Bucket=BUCKET, Key=key)
    except ClientError as error:
        if error.response["Error"]["Code"] in ("NoSuchKey", "404"):
            raise NoTaskError(key)
        raise
    return json.loads(response["Body"].read().decode("utf-8"))

def put_png(key: str, data) -> None:
    s3.upload_fileobj(data, Bucket=BUCKET, Key=key, ExtraArgs={"ContentType": "image/png"})

def key_exists(prefix: str) -> bool:
    response = s3.list_objects_v2(Bucket=BUCKET, Prefix=prefix, MaxKeys=1)
    return "Contents" in response

def list_objects(prefix: str) -> list[dict]:
    results = []
    paginator = s3.get_paginator("list_objects_v2")
    for page in paginator.paginate(Bucket=BUCKET, Prefix=prefix):
        results.extend(page.get("Contents", []))
    return results

def delete_key(key: str) -> None:
    s3.delete_object(Bucket=BUCKET, Key=key)

def delete_folder(prefix: str) -> int:
    objects = list_objects(prefix)
    for i in range(0, len(objects), 1000):
        batch = [{"Key": obj["Key"]} for obj in objects[i:i + 1000]]
        s3.delete_objects(Bucket=BUCKET, Delete={"Objects": batch})
    return len(objects)

# SITE

def wake_site(reason: str) -> None:
    try:
        lam.invoke(FunctionName=SITE_FUNCTION, InvocationType="Event", Payload=json.dumps({"source": "manual", "reason": reason}).encode())
        logger.info(f"woke {SITE_FUNCTION}: {reason}")
    except Exception as error:
        logger.warning(f"could not wake {SITE_FUNCTION}: {error}")

# CATALOG

def load_product(id: int) -> dict:
    return get_json(catalog_key(id))

def catalog_ids() -> list[str]:
    keys = [obj["Key"] for obj in list_objects(CATALOG_PREFIX)]
    return sorted(key[len(CATALOG_PREFIX):-5] for key in keys if key.endswith(".json"))

def load_strikes() -> dict:
    try:
        return get_json(STRIKES_KEY) or {}
    except NoTaskError:
        return {}

def save_strikes(data: dict) -> None:
    put_json(STRIKES_KEY, data)

# BATCH

def load_batch() -> Batch:
    try:
        data = get_json(BATCH_KEY)
    except NoTaskError:
        return None
    return Batch.from_dict(data) if data else None

def save_batch(batch: Batch) -> None:
    put_json(BATCH_KEY, batch.to_dict())

def list_batches() -> list[Batch]:
    keys = [obj["Key"] for obj in list_objects(BATCHES_PREFIX) if obj["Key"].endswith(".json")]
    return [Batch.from_dict(get_json(key)) for key in keys]

# TASK

def archive_exists(key: str) -> bool:
    return key_exists(archive_key(key))

def load_task() -> Task:
    data = get_json(TASK_KEY)
    if not data:
        raise NoTaskError(TASK_KEY)
    return Task.from_dict(data)

def save_task(task: Task) -> None:
    task.updated_at = int(time.time())
    put_json(TASK_KEY, task.to_dict())

def archive_task(task: Task) -> None:
    put_json(archive_key(task.key), task.to_dict())

def clear_task() -> None:
    put_json(TASK_KEY, {})

def remove_product(task: Task) -> None:
    if task.product.shopify_id:
        try:
            delete_product(task)
        except TaskAborted as error:
            logger.warning(f"{task.desc} productDelete refused, product left behind: {error}")
    delete_folder(cdn_prefix(task.key))
    delete_key(archive_key(task.key))

def drop_pair(task: Task, batch: Batch) -> None:
    batch.drop(task.product.id)
    sibling = task.sibling
    if not archive_exists(sibling):
        return
    other = Task.from_dict(get_json(archive_key(sibling)))
    remove_product(other)
    logger.warning(f"{other.desc} removed with its dropped pair")

def abort_task(task: Task) -> None:
    if task.product.shopify_id:
        try:
            delete_product(task)
        except Exception as error:
            logger.warning(f"{task.desc} productDelete failed during abort: {error}")
    else:
        try:
            delete_files(task, [m.shopify_id for m in task.mockups if m.shopify_id])
        except Exception as error:
            logger.warning(f"{task.desc} fileDelete failed during abort: {error}")
    delete_folder(cdn_prefix(task.key))
    delete_key(archive_key(task.key))
    strikes = load_strikes()
    count = strikes.get(str(task.product.id), 0) + 1
    strikes[str(task.product.id)] = count
    save_strikes(strikes)
    out = count >= MAX_STRIKES
    batch = load_batch()
    if batch and batch.design == task.design:
        if out:
            drop_pair(task, batch)
        else:
            batch.mark(task.product.id, task.primary, OPEN)
        save_batch(batch)
    clear_task()
    fate = f"strike {count}/{MAX_STRIKES}, " + ("pair dropped for this batch" if out else "open again")
    logger.error(f"{task.desc} aborted at {task.step}, product {task.product.id} {fate}: {task.metadata.get('failed_error') or ''}")
