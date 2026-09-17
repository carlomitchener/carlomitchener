import boto3
import json
import time
from config import BUCKET, DELAY
from helpers import all_ids, load_json, product_path

s3 = boto3.client("s3")

PREFIX = "data/products/"

def product_key(id: int) -> str:
    return f"{PREFIX}{id}.json"

def put_json(key: str, data) -> None:
    s3.put_object(
        Bucket=BUCKET,
        Key=key,
        Body=json.dumps(data),
        ContentType="application/json",
    )

def upload_products(ids: list[int]) -> None:
    print(f"Uploading {len(ids)} products to {BUCKET}/{PREFIX}")
    for id in ids:
        key = product_key(id)
        put_json(key, load_json(product_path(id)))
        print(f"Uploaded: {key}")
        time.sleep(DELAY)
    print(f"Uploaded {len(ids)} products")

def list_products() -> list[str]:
    keys = []
    paginator = s3.get_paginator("list_objects_v2")
    for page in paginator.paginate(Bucket=BUCKET, Prefix=PREFIX):
        keys.extend(obj["Key"] for obj in page.get("Contents", []))
    return keys

def delete_products() -> None:
    keys = list_products()
    if not keys:
        print(f"Nothing under {BUCKET}/{PREFIX}")
        return
    for i in range(0, len(keys), 1000):
        batch = [{"Key": key} for key in keys[i:i + 1000]]
        s3.delete_objects(Bucket=BUCKET, Delete={"Objects": batch})
    print(f"Deleted {len(keys)} objects under {BUCKET}/{PREFIX}")

if __name__ == "__main__":
    ids = all_ids()
    upload_products(ids)
