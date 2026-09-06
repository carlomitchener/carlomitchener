import boto3
import json
import time
from botocore.exceptions import ClientError
from .api import delete_product, logger
from .config import CARLOMITCHENER_BUCKET, SITE_URL
from .errors import NoTaskError
from .models import Task

s3 = boto3.client("s3")

BUCKET = CARLOMITCHENER_BUCKET
AUTOMATOR_KEY = "data/automator.json"
PATHS_KEY = "data/paths.json"
SITE_PREFIX = "site/"

# KEYS

def product_key(id: int) -> str:
    return f"data/products/{id}.json"

def task_key(key: str) -> str:
    return f"data/tasks/{key}/{key}.json"

def task_prefix(key: str) -> str:
    return f"data/tasks/{key}/"

def art_prefix(key: str) -> str:
    return f"{SITE_PREFIX}art/{key}/"

def art_key(key: str, name: str) -> str:
    return f"{SITE_PREFIX}art/{key}/{name}.png"

def s3_url(key: str) -> str:
    if key.startswith(SITE_PREFIX):
        key = key[len(SITE_PREFIX):]
    return f"{SITE_URL}/{key}"

# OBJECTS

def put_json(key: str, data) -> None:
    s3.put_object(
        Bucket=BUCKET,
        Key=key,
        Body=json.dumps(data),
        ContentType="application/json",
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

def delete_folder(prefix: str) -> int:
    objects = list_objects(prefix)
    for i in range(0, len(objects), 1000):
        batch = [{"Key": obj["Key"]} for obj in objects[i:i + 1000]]
        s3.delete_objects(Bucket=BUCKET, Delete={"Objects": batch})
    return len(objects)

# CATALOG

def task_exists(key: str) -> bool:
    return key_exists(task_key(key))

def load_product(id: int) -> dict:
    return get_json(product_key(id))

def load_paths() -> dict:
    return get_json(PATHS_KEY)

def save_paths(data: dict) -> None:
    put_json(PATHS_KEY, data)

# TASK

def load_task() -> Task:
    data = get_json(AUTOMATOR_KEY)
    if not data:
        raise NoTaskError(AUTOMATOR_KEY)
    return Task.from_dict(data)

def save_task(task: Task) -> None:
    task.updated_at = int(time.time())
    put_json(AUTOMATOR_KEY, task.to_dict())

def archive_task(task: Task) -> None:
    put_json(task_key(task.key), task.to_dict())

def clear_task() -> None:
    put_json(AUTOMATOR_KEY, {})

def abort_task(task: Task) -> None:
    if task.product.shopify_id:
        try:
            delete_product(task)
        except Exception as error:
            logger.info(f"{task.desc} productDelete failed during abort: {error}")
    delete_folder(task_prefix(task.key))
    delete_folder(art_prefix(task.key))
    paths = load_paths()
    paths[str(task.product.id)] = None
    save_paths(paths)
    clear_task()
    logger.info(f"{task.desc} quarantined product {task.product.id}")
