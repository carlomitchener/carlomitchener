import boto3

s3 = boto3.client("s3")

# HELPERS

def get_public_access_block(bucket):
    try:
        r = s3.get_public_access_block(Bucket=bucket)
        return r["PublicAccessBlockConfiguration"]
    except s3.exceptions.NoSuchPublicAccessBlockConfiguration:
        return None

def get_versioning(bucket):
    r = s3.get_bucket_versioning(Bucket=bucket)
    return r.get("Status", "Disabled")

def get_encryption(bucket):
    try:
        r = s3.get_bucket_encryption(Bucket=bucket)
        rules = r["ServerSideEncryptionConfiguration"]["Rules"]
        return rules[0]["ApplyServerSideEncryptionByDefault"]["SSEAlgorithm"]
    except Exception:
        return "None"

# COMMANDS

def check():
    buckets = [b["Name"] for b in s3.list_buckets()["Buckets"]]
    print(f"Found {len(buckets)} buckets\n")
    settings = {}
    for bucket in buckets:
        pub = get_public_access_block(bucket)
        if pub is None:
            is_private = False
            block_detail = "no config"
        else:
            flags = [pub.get("BlockPublicAcls"), pub.get("IgnorePublicAcls"), pub.get("BlockPublicPolicy"), pub.get("RestrictPublicBuckets")]
            is_private = all(flags)
            if not is_private:
                off = ["BlockPublicAcls", "IgnorePublicAcls", "BlockPublicPolicy", "RestrictPublicBuckets"]
                block_detail = "off: " + ", ".join(k for k, v in zip(off, flags) if not v)
            else:
                block_detail = "all blocked"
        versioning = get_versioning(bucket)
        encryption = get_encryption(bucket)
        settings[bucket] = {"versioning": versioning, "encryption": encryption, "block_detail": block_detail}
        status = "PRIVATE" if is_private else "PUBLIC "
        print(f"  [{status}]  {bucket}")
        print(f"           block={block_detail}  versioning={versioning}  encryption={encryption}")
    print()
    values = [f"{s['versioning']}|{s['encryption']}|{s['block_detail']}" for s in settings.values()]
    if len(set(values)) == 1:
        print("All buckets have identical settings.")
    else:
        print("Settings differ between buckets:")
        for bucket, val in zip(settings.keys(), values):
            print(f"  {bucket}: {val}")

def transfer():
    src = "mrlywear"
    dst = "mrlyshop"
    paginator = s3.get_paginator("list_objects_v2")
    total_copied = 0
    total_deleted = 0
    for page in paginator.paginate(Bucket=src):
        objects = page.get("Contents", [])
        if not objects:
            continue
        for obj in objects:
            key = obj["Key"]
            s3.copy_object(CopySource={"Bucket": src, "Key": key}, Bucket=dst, Key=key)
            total_copied += 1
            print(f"Copied ({total_copied}): {key}")
        keys = [{"Key": obj["Key"]} for obj in objects]
        s3.delete_objects(Bucket=src, Delete={"Objects": keys})
        total_deleted += len(keys)
        print(f"Deleted {len(keys)} objects from {src} (total: {total_deleted})")
    print(f"\nDone. Copied {total_copied} objects from {src} to {dst}.")

if __name__ == "__main__":
    check()
