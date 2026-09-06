import os

try:
    from env import load_env
    load_env()
except ImportError:
    pass

# AWS

CARLOMITCHENER_BUCKET = os.environ["CARLOMITCHENER_BUCKET"]
SITE_URL = os.environ.get("SITE_URL") or "https://carlomitchener.com"

# PRINTFUL

PRINTFUL_API_KEY = os.environ["PRINTFUL_API_KEY"]
PRINTFUL_URL = "https://api.printful.com/"

# SHOPIFY

API_VERSION = "2026-07"
SHOPIFY_SHOP_URL = os.environ["SHOPIFY_SHOP_URL"]
SHOPIFY_CLIENT_ID = os.environ["SHOPIFY_CLIENT_ID"]
SHOPIFY_SECRET = os.environ["SHOPIFY_SECRET"]
SHOPIFY_ONLINE_STORE_ID = os.environ["SHOPIFY_ONLINE_STORE_ID"]
SHOPIFY_HEADLESS_ID = os.environ["SHOPIFY_HEADLESS_ID"]
SHOPIFY_ADMIN_URL = f"https://{SHOPIFY_SHOP_URL}/admin/api/{API_VERSION}/graphql.json"
SHOPIFY_AUTH_URL = f"https://{SHOPIFY_SHOP_URL}/admin/oauth/access_token"
