import json
import urllib.error
import urllib.parse
import urllib.request

from env import gate, load_env, need, save_env, say, verb

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

PRODUCTS = """
query($cursor: String) {
    products(first: 250, after: $cursor) {
        pageInfo { hasNextPage endCursor }
        nodes { id title }
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

# PURGE

def purge():
    access = token()
    ids = []
    cursor = None
    while True:
        page = graphql(access, PRODUCTS, {"cursor": cursor})["products"]
        ids += [node["id"] for node in page["nodes"]]
        if not page["pageInfo"]["hasNextPage"]: break
        cursor = page["pageInfo"]["endCursor"]
    if not gate("purge", [
        f"delete {len(ids)} products from the shop behind SHOPIFY_SHOP_URL",
        "productDelete, one call each, no undo",
    ]): return
    for count, one in enumerate(ids, 1):
        result = graphql(access, DELETE, {"input": {"id": one}})["productDelete"]
        if result["userErrors"]:
            say(f"  {one} {result['userErrors']}")
            continue
        say(f"  deleted {count}/{len(ids)}")
    say(f"{len(ids)} products deleted")

# MAIN

VERBS = {
    "publications": publications,
    "purge": purge,
}

if __name__ == "__main__":
    VERBS[verb(list(VERBS))]()
