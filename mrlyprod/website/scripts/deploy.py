import mimetypes
import os
import shutil
import subprocess
import uuid
from utils.boto import put_file, delete_folder

from utils.helpers import load_env
from sitemap import generate as generate_sitemap

load_env()

ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MRLYNET_ID = os.environ["MRLYNET_ID"]
MRLYNET_BUCKET = os.environ["MRLYNET_BUCKET"]

import boto3
from botocore.exceptions import ClientError
cf_client = boto3.client("cloudfront")

BUILD_DIR = os.path.join(ROOT_DIR, "dist")
BLANK_DIR = os.path.join(ROOT_DIR, "blank")

# CACHING

IMMUTABLE_CACHE = "public, max-age=31536000, immutable"
DEFAULT_CACHE = "max-age=86400"
NO_CACHE = "no-cache"

def get_cache_control(s3_path):
    if s3_path == "index.html":
        return NO_CACHE
    if "assets/" in s3_path:
        return IMMUTABLE_CACHE
    return DEFAULT_CACHE

# BUILD

def build_project():
    print("Building project...")
    try:
        subprocess.run(["npm", "install"], cwd=ROOT_DIR, check=True)
        subprocess.run(["npm", "run", "build"], cwd=ROOT_DIR, check=True)
        print("Build successful.")
    except subprocess.CalledProcessError as e:
        print(f"Build failed: {e}")
        exit(1)

# SYNC

CONTENT_TYPES = {
    ".html": "text/html",
    ".css": "text/css",
    ".js": "application/javascript",
    ".json": "application/json",
    ".svg": "image/svg+xml",
    ".png": "image/png",
    ".ico": "image/x-icon",
    ".webp": "image/webp",
    ".woff2": "font/woff2",
    ".xml": "application/xml",
    ".txt": "text/plain",
}

def wipe_bucket():
    print(f"Wiping s3://{MRLYNET_BUCKET}...")
    delete_folder("", MRLYNET_BUCKET)
    print("Wipe complete.")

def sync_site(source_dir=BUILD_DIR):
    if not os.path.exists(source_dir):
        print(f"Directory '{source_dir}' not found!")
        exit(1)
    wipe_bucket()
    print(f"Uploading s3://{MRLYNET_BUCKET} from '{source_dir}'...")
    upload_count = 0
    for root, dirs, files in os.walk(source_dir):
        if ".vite" in root: continue
        for file in files:
            if file == ".DS_Store": continue
            local_path = os.path.join(root, file)
            s3_path = os.path.relpath(local_path, source_dir).replace(os.path.sep, "/")
            ext = os.path.splitext(file)[1]
            content_type = (
                CONTENT_TYPES.get(ext)
                or mimetypes.guess_type(local_path)[0]
                or "application/octet-stream"
            )
            cache_control = get_cache_control(s3_path)
            put_file(local_path, s3_path, MRLYNET_BUCKET, content_type=content_type, cache_control=cache_control)
            upload_count += 1
            print(f"Uploaded: {s3_path}")
    print(f"Upload complete ({upload_count} files).")

# INVALIDATE

def invalidate_cloudfront(paths=["/*"]):
    print(f"Invalidating CloudFront: {MRLYNET_ID} {paths}...")
    try:
        response = cf_client.create_invalidation(
            DistributionId=MRLYNET_ID,
            InvalidationBatch={
                "Paths": {"Quantity": len(paths), "Items": paths},
                "CallerReference": str(uuid.uuid4())
            },
        )
        print(f"Invalidation created: {response['Invalidation']['Id']}")
    except ClientError as e:
        print(f"Failed to invalidate: {e}")

# BLANK

def deploy_blank():
    print(f"Deploying blank site to {MRLYNET_BUCKET}...")
    sync_site(source_dir=BLANK_DIR)
    invalidate_cloudfront()

# MRLYNET

def deploy_mrlynet():
    print(f"Deploying site to {MRLYNET_BUCKET}...")
    generate_sitemap()
    build_project()
    sync_site()
    invalidate_cloudfront()

if __name__ == "__main__":
    deploy_mrlynet()
