import json
import os
import re
import urllib.error
import urllib.parse
import urllib.request

from env import SHOP_DIR, gate, load_env, load_json, need, save_env, say, verb

load_env()

# API

API_VERSION = "2026-07"
SHOP = need("SHOPIFY_SHOP_URL")
ADMIN_URL = f"https://{SHOP}/admin/api/{API_VERSION}/graphql.json"
AUTH_URL = f"https://{SHOP}/admin/oauth/access_token"
ONLINE_STORE = "Online Store"
HEADLESS = "Headless"

def post(url, body, headers):
    request = urllib.request.Request(url, data=body, headers=headers, method="POST")
    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            return json.loads(response.read())
    except urllib.error.HTTPError as error:
        raise SystemExit(f"admin api {error.code}")

def token():
    body = urllib.parse.urlencode({
        "client_id": need("SHOPIFY_CLIENT_ID"),
        "client_secret": need("SHOPIFY_SECRET"),
        "grant_type": "client_credentials",
    }).encode()
    headers = {"Content-Type": "application/x-www-form-urlencoded"}
    data = post(AUTH_URL, body, headers)
    if "access_token" not in data:
        raise SystemExit("admin token refused")
    return data["access_token"]

def graphql(access, query, variables=None):
    body = json.dumps({"query": query, "variables": variables or {}}).encode()
    headers = {"Content-Type": "application/json", "X-Shopify-Access-Token": access}
    data = post(ADMIN_URL, body, headers)
    if "errors" in data:
        raise SystemExit(f"graphql: {json.dumps(data['errors'])[:300]}")
    return data["data"]

# QUERIES

PUBLICATIONS = """
query {
    publications(first: 50) {
        nodes { id name }
    }
}
"""

VENDOR = "Printful"
AUTOMATOR = re.compile(r"^[0-9a-f]{8}-")
CATALOG_PATH = os.path.join(SHOP_DIR, "files", "catalog.json")

PRODUCTS = """
query($cursor: String) {
    products(first: 250, after: $cursor) {
        pageInfo { hasNextPage endCursor }
        nodes { id title handle vendor productType }
    }
}
"""

UPDATE = """
mutation($product: ProductUpdateInput!) {
    productUpdate(product: $product) {
        product { id vendor }
        userErrors { field message }
    }
}
"""

DELETE = """
mutation($input: ProductDeleteInput!) {
    productDelete(input: $input) {
        deletedProductId
        userErrors { field message }
    }
}
"""

# PUBLICATIONS

def publications():
    if not gate("publications", [
        f"admin graphql {API_VERSION} on the shop behind SHOPIFY_SHOP_URL",
        f"list every publication, find {ONLINE_STORE} and {HEADLESS}",
        "save SHOPIFY_ONLINE_STORE_ID and SHOPIFY_HEADLESS_ID",
    ]): return
    nodes = graphql(token(), PUBLICATIONS)["publications"]["nodes"]
    store = ""
    headless = ""
    for node in nodes:
        say(f"  {node['name']}")
        if node["name"] == ONLINE_STORE: store = node["id"]
        if HEADLESS in node["name"]: headless = node["id"]
    if not store:
        raise SystemExit(f"refuse: no {ONLINE_STORE} publication on this shop")
    if not headless:
        raise SystemExit(f"refuse: no {HEADLESS} publication on this shop")
    save_env("SHOPIFY_ONLINE_STORE_ID", store)
    save_env("SHOPIFY_HEADLESS_ID", headless)

# PRODUCTS

def products(access):
    nodes = []
    cursor = None
    while True:
        page = graphql(access, PRODUCTS, {"cursor": cursor})["products"]
        nodes += page["nodes"]
        if not page["pageInfo"]["hasNextPage"]: break
        cursor = page["pageInfo"]["endCursor"]
    return nodes

def automated(node, ids):
    return bool(AUTOMATOR.match(node["handle"])) and node["productType"] in ids

def split(nodes):
    ids = {str(row["id"]) for row in load_json(CATALOG_PATH)}
    ours = [node for node in nodes if automated(node, ids)]
    others = [node for node in nodes if not automated(node, ids)]
    return ours, others

def skipped(others):
    for node in others:
        say(f"  skip {node['handle']} vendor {node['vendor']}")

# PURGE

def purge():
    access = token()
    ours, others = split(products(access))
    ids = [node["id"] for node in ours if node["vendor"] == VENDOR]
    others += [node for node in ours if node["vendor"] != VENDOR]
    skipped(others)
    if not gate("purge", [
        f"delete {len(ids)} automator products with vendor {VENDOR} from the shop behind SHOPIFY_SHOP_URL",
        f"productDelete, one call each, no undo; the {len(others)} skipped above stay",
    ]): return
    for count, one in enumerate(ids, 1):
        result = graphql(access, DELETE, {"input": {"id": one}})["productDelete"]
        if result["userErrors"]:
            say(f"  {one} {result['userErrors']}")
            continue
        say(f"  deleted {count}/{len(ids)}")
    say(f"{len(ids)} products deleted")

# VENDOR

def vendor():
    access = token()
    ours, others = split(products(access))
    stale = [node for node in ours if node["vendor"] != VENDOR]
    skipped(others)
    if not gate("vendor", [
        f"set vendor {VENDOR} on {len(stale)} automator products that carry another vendor",
        f"productUpdate, one call each; the {len(others)} skipped above stay",
    ]): return
    for count, node in enumerate(stale, 1):
        result = graphql(access, UPDATE, {"product": {"id": node["id"], "vendor": VENDOR}})["productUpdate"]
        if result["userErrors"]:
            say(f"  {node['id']} {result['userErrors']}")
            continue
        say(f"  {count}/{len(stale)} {node['title']} was {node['vendor']}")
    say(f"{len(stale)} products now {VENDOR}")

# MAIN

VERBS = {
    "publications": publications,
    "purge": purge,
    "vendor": vendor,
}

if __name__ == "__main__":
    VERBS[verb(list(VERBS))]()
