import os

try:
    from utils.helpers import load_env
    load_env()
except ImportError:
    pass

# SETTINGS
MODE = "PROD"

# AWS
MRLYCDN_BUCKET = os.environ["MRLYCDN_BUCKET"]
MRLYSHOP_BUCKET = os.environ["MRLYSHOP_BUCKET"]

# PRINTFUL
PRINTFUL_API_KEY = os.environ["PRINTFUL_API_KEY"]
PRINTFUL_BASE_URL = "https://api.printful.com/"

# SHOPIFY
SHOPIFY_SHOP = os.environ["SHOPIFY_SHOP"]
SHOPIFY_ONLINE_STORE_ID = os.environ["SHOPIFY_ONLINE_STORE_ID"]
SHOPIFY_SHOP_URL = f"https://{SHOPIFY_SHOP}/admin/api/2026-01/graphql.json"
SHOPIFY_STOREFRONT_TOKEN = os.environ.get("SHOPIFY_STOREFRONT_TOKEN")
