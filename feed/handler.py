import argparse
import json
import os
import random
import shutil
import time
from datetime import datetime, timezone
from typing import Any, Dict
from config import DATA_DIR, INDEX, POSTS, PREFIX, files
from main import expired, make

# PLACE

LAMBDA = "AWS_LAMBDA_FUNCTION_NAME"
TMP = "/tmp/feed"
IMMUTABLE = "public, max-age=31536000, immutable"
NO_CACHE = "no-cache"
TYPES = {".mp4": "video/mp4", ".webp": "image/webp", ".json": "application/json"}

SITE_FUNCTION = "carlomitchener-site"

def in_lambda() -> bool:
    return bool(os.environ.get(LAMBDA))

def dry() -> bool:
    return bool(os.environ.get("DRY"))

def root() -> str:
    return TMP if in_lambda() else DATA_DIR

def content_type(name: str) -> str:
    return TYPES.get(os.path.splitext(name)[1], "application/octet-stream")

# S3

def wake_site(name: str) -> None:
    import boto3
    try:
        boto3.client("lambda").invoke(FunctionName=SITE_FUNCTION, InvocationType="Event", Payload=json.dumps({"source": "manual", "reason": f"post {name}"}).encode())
        print(f"woke {SITE_FUNCTION}")
    except Exception as error:
        print(f"could not wake {SITE_FUNCTION}: {error}")

def upload(base: str, name: str, row: Dict[str, Any]) -> int:
    import boto3
    from botocore.exceptions import ClientError
    s3 = boto3.client("s3")
    bucket = os.environ["CARLOMITCHENER_BUCKET"]
    count = 0
    for file in files(name):
        s3.upload_file(
            os.path.join(base, POSTS, name, file), bucket, f"{PREFIX}/{POSTS}/{name}/{file}",
            ExtraArgs={"ContentType": content_type(file), "CacheControl": IMMUTABLE},
        )
        count += 1
    rows = []
    try:
        body = s3.get_object(Bucket=bucket, Key=f"{PREFIX}/{INDEX}")["Body"].read()
        rows = [item for item in json.loads(body) if item.get("name") != row["name"]]
    except ClientError as error:
        if error.response["Error"]["Code"] not in ("NoSuchKey", "404"):
            raise
    for item in expired(rows, datetime.now(timezone.utc)):
        keys = [{"Key": f"{PREFIX}/{POSTS}/{item['name']}/{file}"} for file in files(item["name"])]
        s3.delete_objects(Bucket=bucket, Delete={"Objects": keys})
        rows.remove(item)
        print(f"reap {item['name']}")
    rows.insert(0, row)
    s3.put_object(
        Bucket=bucket, Key=f"{PREFIX}/{INDEX}", Body=json.dumps(rows).encode(),
        ContentType="application/json", CacheControl=NO_CACHE,
    )
    print(f"upload {count + 1} keys to s3://{bucket}/{PREFIX}/ ({len(rows)} posts)")
    return count + 1

# RUN

def run(seed: int = None) -> Dict[str, Any]:
    started = time.time()
    seed = random.getrandbits(32) if seed is None else int(seed)
    base = root()
    if in_lambda():
        shutil.rmtree(base, ignore_errors=True)
    os.makedirs(base, exist_ok=True)
    print(f"start seed {seed} root {base}")
    record = make(seed, base)
    manifest = record["manifest"]
    if dry():
        print("dry, nothing uploaded")
    else:
        upload(base, manifest["name"], record["row"])
        wake_site(manifest["name"])
    answer = {
        "name": manifest["name"],
        "seed": seed,
        "duration": manifest["duration"],
        "sizes": manifest["sizes"],
        "ms": dict(record["ms"], total=int((time.time() - started) * 1000)),
    }
    print(f"done {json.dumps(answer)}")
    return answer

def handler(event, context):
    event = event or {}
    return run(event.get("seed"))

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--seed", type=int, default=None)
    run(parser.parse_args().seed)
