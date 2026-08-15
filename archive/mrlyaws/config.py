import os
from mrlycloud.helpers import load_env

load_env()

# AWS
AWS_ACCOUNT_ID = os.environ["AWS_ACCOUNT_ID"]
AWS_REGION = os.environ.get("AWS_REGION", "us-east-2")
ROLE_NAME = os.environ["ROLE_NAME"]
ROLE_ARN = os.environ["ROLE_ARN"]

# LAYERS

def layer_arn(name: str, version: int) -> str:
    return f"arn:aws:lambda:{AWS_REGION}:{AWS_ACCOUNT_ID}:layer:{name}:{version}"

BOTO3_ARN = layer_arn("boto3", 1)
FFMPEG_ARN = layer_arn("ffmpeg", 4)
HFHUB_ARN = layer_arn("hfhub", 1)
NUMPY_ARN = layer_arn("numpy", 1)
PILLOW_ARN = layer_arn("pillow", 1)
REQUESTS_ARN = layer_arn("requests", 1)

# BUCKETS
MRLYCDN_BUCKET = os.environ["MRLYCDN_BUCKET"]
MRLYNET_BUCKET = os.environ["MRLYNET_BUCKET"]
MRLYSHOP_BUCKET = os.environ["MRLYSHOP_BUCKET"]

MRLYSHOP_AUTOMATOR_ENV_VARS = {
    # BUCKETS
    "MRLYCDN_BUCKET": os.environ["MRLYCDN_BUCKET"],
    "MRLYSHOP_BUCKET": os.environ["MRLYSHOP_BUCKET"],
    # PRINTFUL
    "PRINTFUL_API_KEY": os.environ["PRINTFUL_API_KEY"],
    # SHOPIFY
    "SHOPIFY_CLIENT_ID": os.environ["SHOPIFY_CLIENT_ID"],
    "SHOPIFY_CLIENT_SECRET": os.environ["SHOPIFY_CLIENT_SECRET"],
    "SHOPIFY_ONLINE_STORE_ID": os.environ["SHOPIFY_ONLINE_STORE_ID"],
    "SHOPIFY_SHOP": os.environ["SHOPIFY_SHOP"],
}

MRLYSHOP_STOREFRONT_ENV_VARS = {
    # BUCKETS
    "MRLYCDN_BUCKET": os.environ["MRLYCDN_BUCKET"],
    "MRLYNET_BUCKET": os.environ["MRLYNET_BUCKET"],
    "MRLYSHOP_BUCKET": os.environ["MRLYSHOP_BUCKET"],
    # SHOPIFY
    "SHOPIFY_CLIENT_ID": os.environ["SHOPIFY_CLIENT_ID"],
    "SHOPIFY_CLIENT_SECRET": os.environ["SHOPIFY_CLIENT_SECRET"],
    "SHOPIFY_ONLINE_STORE_ID": os.environ["SHOPIFY_ONLINE_STORE_ID"],
    "SHOPIFY_SHOP": os.environ["SHOPIFY_SHOP"],
    "SHOPIFY_STOREFRONT_TOKEN": os.environ["SHOPIFY_STOREFRONT_TOKEN"],
}
