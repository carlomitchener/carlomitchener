import boto3
import json
from mrlycore.helpers import create_logger

logger = create_logger("mrlyboto")

s3_client = boto3.client("s3")

# URL

CDN_DOMAINS = {
    "mrlycdn": "cdn.mrly.net",
}

def s3_url(key: str, bucket: str) -> str:
    if bucket in CDN_DOMAINS:
        return f"https://{CDN_DOMAINS[bucket]}/{key}"
    return f"https://{bucket}.s3.{s3_client.meta.region_name}.amazonaws.com/{key}"

# JSON

def put_json(key: str, data, bucket: str, cache_control: str = None):
    body = json.dumps(data) if not isinstance(data, str) else data
    kwargs = {"Bucket": bucket, "Key": key, "Body": body, "ContentType": "application/json"}
    if cache_control:
        kwargs["CacheControl"] = cache_control
    s3_client.put_object(**kwargs)

def get_json(key: str, bucket: str) -> dict:
    response = s3_client.get_object(Bucket=bucket, Key=key)
    return json.loads(response["Body"].read().decode("utf-8"))

# PUT

def put_file(local_path: str, key: str, bucket: str, content_type: str = None, cache_control: str = None):
    extra = {}
    if content_type: extra["ContentType"] = content_type
    if cache_control: extra["CacheControl"] = cache_control
    s3_client.upload_file(local_path, bucket, key, ExtraArgs=extra or None)

def put_fileobj(data, key: str, bucket: str, content_type: str):
    s3_client.upload_fileobj(
        data,
        Bucket=bucket,
        Key=key,
        ExtraArgs={"ContentType": content_type}
    )

def put_jpg(key: str, data, bucket: str):
    put_fileobj(data, key, bucket, "image/jpeg")

def put_png(key: str, data, bucket: str):
    put_fileobj(data, key, bucket, "image/png")

def put_webp(key: str, data, bucket: str):
    put_fileobj(data, key, bucket, "image/webp")

def put_mp4(key: str, data, bucket: str):
    put_fileobj(data, key, bucket, "video/mp4")

def put_wav(key: str, data, bucket: str):
    put_fileobj(data, key, bucket, "audio/wav")

def put_folder(key: str, bucket: str):
    s3_client.put_object(Bucket=bucket, Key=f"{key}/")

# GET

def get_file(key: str, local_path: str, bucket: str):
    s3_client.download_file(bucket, key, local_path)

def list_objects(prefix: str, bucket: str) -> list[dict]:
    results = []
    paginator = s3_client.get_paginator("list_objects_v2")
    for page in paginator.paginate(Bucket=bucket, Prefix=prefix):
        if "Contents" not in page: continue
        results.extend(page["Contents"])
    return results

def key_exists(prefix: str, bucket: str) -> bool:
    response = s3_client.list_objects_v2(Bucket=bucket, Prefix=prefix, MaxKeys=1)
    return "Contents" in response

# INVALIDATE

def invalidate_cloudfront(distribution_id: str, paths: list[str] = None):
    import uuid
    cf = boto3.client("cloudfront")
    paths = paths or ["/*"]
    logger.info(f"Invalidating CloudFront: {distribution_id} {paths}")
    response = cf.create_invalidation(
        DistributionId=distribution_id,
        InvalidationBatch={
            "Paths": {"Quantity": len(paths), "Items": paths},
            "CallerReference": str(uuid.uuid4()),
        },
    )
    logger.info(f"Invalidation created: {response['Invalidation']['Id']}")

# CORS

def put_cors(bucket: str, allowed_origins: list[str]):
    s3_client.put_bucket_cors(
        Bucket=bucket,
        CORSConfiguration={
            "CORSRules": [{
                "AllowedOrigins": allowed_origins,
                "AllowedMethods": ["GET", "HEAD"],
                "AllowedHeaders": ["*"],
                "MaxAgeSeconds": 86400,
            }]
        },
    )
    logger.info(f"CORS configured on {bucket}: {allowed_origins}")

# DELETE

def delete_object(key: str, bucket: str):
    s3_client.delete_object(Bucket=bucket, Key=key)

def delete_folder(prefix: str, bucket: str):
    paginator = s3_client.get_paginator("list_objects_v2")
    for page in paginator.paginate(Bucket=bucket, Prefix=prefix):
        if "Contents" not in page: continue
        objects = [{"Key": obj["Key"]} for obj in page["Contents"]]
        s3_client.delete_objects(Bucket=bucket, Delete={"Objects": objects})
