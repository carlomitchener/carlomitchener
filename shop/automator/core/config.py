import os

# ENV

HERE = os.path.dirname(os.path.abspath(__file__))
DESK = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(HERE))))
ENV_PATH = os.path.join(DESK, ".env")

def load_env() -> None:
    if not os.path.exists(ENV_PATH):
        return
    with open(ENV_PATH) as handle:
        for line in handle:
            line = line.strip()
            if not line or line.startswith("#"):
                continue
            key, _, value = line.partition("=")
            os.environ.setdefault(key.strip(), value.strip())

def need(key: str) -> str:
    value = os.environ.get(key)
    if not value:
        raise RuntimeError(f"{key} is not set")
    return value

load_env()

# AWS

CARLOMITCHENER_BUCKET = need("CARLOMITCHENER_BUCKET")
SITE_URL = os.environ.get("SITE_URL") or "https://carlomitchener.com"

# LIFE

LIVE_DAYS = 29.53

# SITE

SITE_FUNCTION = "carlomitchener-site"

# DESIGN

PRIMARIES = ["White"]
TILES = [1, 3, 5, 7, 9]

# BUDGETS

MOCKUP_BUDGET = 30 * 60
STATUS_BUDGET = 20 * 60
PING_BUDGET = 60 * 60
FILE_ROUNDS = 3
MAX_FAILURES = 3
MAX_STRIKES = 3
MAX_RENDERS = 3
TICK_RESERVE = 25

# PRINTFUL

PRINTFUL_API_KEY = need("PRINTFUL_API_KEY")
PRINTFUL_URL = "https://api.printful.com/"

# SHOPIFY

API_VERSION = "2026-07"
SHOPIFY_SHOP_URL = need("SHOPIFY_SHOP_URL")
SHOPIFY_CLIENT_ID = need("SHOPIFY_CLIENT_ID")
SHOPIFY_SECRET = need("SHOPIFY_SECRET")
SHOPIFY_ONLINE_STORE_ID = need("SHOPIFY_ONLINE_STORE_ID")
SHOPIFY_HEADLESS_ID = need("SHOPIFY_HEADLESS_ID")
SHOPIFY_ADMIN_URL = f"https://{SHOPIFY_SHOP_URL}/admin/api/{API_VERSION}/graphql.json"
SHOPIFY_AUTH_URL = f"https://{SHOPIFY_SHOP_URL}/admin/oauth/access_token"
