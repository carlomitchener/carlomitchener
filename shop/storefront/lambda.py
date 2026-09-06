import json
import os
from utils import requests

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
import time
from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
from typing import List

from utils.boto import s3_url, delete_folder, put_json, get_json
from utils.shopify import get_admin_token

try:
    from utils.helpers import load_env
    load_env()
except ImportError:
    pass

# CONFIG

MRLYCDN_BUCKET = os.environ["MRLYCDN_BUCKET"]
MRLYSHOP_BUCKET = os.environ["MRLYSHOP_BUCKET"]

SHOPIFY_SHOP = os.environ["SHOPIFY_SHOP"]
SHOPIFY_STOREFRONT_TOKEN = os.environ["SHOPIFY_STOREFRONT_TOKEN"]

API_VERSION = "2026-01"
STOREFRONT_API_URL = f"https://{SHOPIFY_SHOP}/api/{API_VERSION}/graphql.json"
ADMIN_API_URL = f"https://{SHOPIFY_SHOP}/admin/api/{API_VERSION}/graphql.json"
OUTPUT_FILE = "mrlyshop/files/data.json"
CACHE_CONTROL = "max-age=900"

PRODUCT_COUNT = 250
DAYS_OLD = 7
DAYS_OLD_DELETE = 14
HOURS_RECENT = 24

from mrlypy.core.helpers import create_logger
logger = create_logger("mrlyshop-storefront")

# QUERY

QUERY = """
query HomePage($first: Int!, $country: CountryCode, $cursor: String) @inContext(country: $country) {
products(first: $first, sortKey: CREATED_AT, reverse: true, after: $cursor) {
    pageInfo {
        hasNextPage
        endCursor
    }
    nodes {
    id
    handle
    title
    tags
    createdAt
    availableForSale
    productType
    variants(first: 50) {
        nodes {
            id
            price {
                amount
            }
            availableForSale
            selectedOptions {
                name
                value
            }
        }
    }
    media(first: 50) {
        nodes {
            mediaContentType
            ... on MediaImage {
                image {
                    url
                    altText
                }
        }
        }
    }
    }
}
}
"""

QUERY_OLDEST_PRODUCT = """
query products($query: String!) {
    products(first: 1, query: $query, sortKey: CREATED_AT) {
        nodes {
            id
            handle
        }
    }
}
"""

MUTATION_DELETE_PRODUCT = """
mutation productDelete($input: ProductDeleteInput!) {
    productDelete(input: $input) {
        deletedProductId
        userErrors {
            field
            message
        }
    }
}
"""

VARIABLES = {
    "country": "US",
    "first": PRODUCT_COUNT
}

# MODELS

@dataclass
class Image:
    key: str
    alt: str
    def to_list(self):
        return [self.key, self.alt]

@dataclass
class Variant:
    id: str
    size: str
    price: str
    def to_list(self):
        return [self.id, self.size, self.price]

@dataclass
class Product:
    id: str
    handle: str
    product_type: str
    created_at: str
    variants: List[Variant] = field(default_factory=list)
    images: List[Image] = field(default_factory=list)
    def to_list(self):
        return [
            self.id,
            self.handle,
            self.product_type,
            self.created_at,
            [v.to_list() for v in self.variants],
            [i.to_list() for i in self.images]
        ]

# PARSE

def extract_gid(gid: str) -> str:
    return gid.split("/")[-1]

def parse_variant(node) -> Variant:
    size = "One Size"
    for opt in node["selectedOptions"]:
        if opt["name"] == "Size":
            size = opt["value"]
            break
    return Variant(
        id=extract_gid(node["id"]),
        size=size,
        price=node["price"]["amount"]
    )

def parse_images(nodes) -> List[Image]:
    images = []
    for node in nodes:
        if node["mediaContentType"] != "IMAGE":
            continue
        alt = node["image"]["altText"] or ""
        if "Tile" in alt:
             continue
        mockup_id = alt.split("-")[0].strip()
        url = node["image"]["url"]
        filename = url.split("?")[0].split("/")[-1]
        filename = filename[:-4]
        parts = filename.split("-")
        key = parts[-1]
        images.append(Image(key=key, alt=mockup_id))
    return images

def parse_product(node) -> Product:
    return Product(
        id=extract_gid(node["id"]),
        handle=node["handle"],
        product_type=node["productType"],
        created_at=node["createdAt"],
        variants=[parse_variant(v) for v in node["variants"]["nodes"]],
        images=parse_images(node["media"]["nodes"])
    )

# FETCH

def fetch_products() -> List[dict]:
    logger.info("Fetching products from Shopify...")
    headers = {
        "Content-Type": "application/json",
        "X-Shopify-Storefront-Access-Token": SHOPIFY_STOREFRONT_TOKEN
    }
    nodes = []
    cursor = None
    has_next_page = True
    cutoff_date = datetime.now(timezone.utc) - timedelta(days=DAYS_OLD)
    logger.info(f"Filtering products older than {cutoff_date.isoformat()}")
    while has_next_page:
        params_variables = VARIABLES.copy()
        if cursor:
            params_variables["cursor"] = cursor
        payload = {
            "query": QUERY,
            "variables": params_variables
        }
        response = requests.post(STOREFRONT_API_URL, json=payload, headers=headers)
        response.raise_for_status()
        data = response.json()
        if "errors" in data:
            raise Exception(f"GraphQL error: {data['errors']}")
        if data.get("data") is None:
            raise Exception(f"Unexpected response: {json.dumps(data)[:500]}")
        products_data = data["data"]["products"]
        for node in products_data["nodes"]:
            created_at_dt = datetime.fromisoformat(node["createdAt"].replace("Z", "+00:00"))
            if created_at_dt < cutoff_date:
                logger.info(f"Encountered product created at {node['createdAt']}. Stopping fetch (older than {DAYS_OLD} days).")
                has_next_page = False
                break
            nodes.append(node)
        if not has_next_page:
            break
        page_info = products_data["pageInfo"]
        has_next_page = page_info["hasNextPage"]
        cursor = page_info["endCursor"]
        logger.info(f"Fetched {len(products_data['nodes'])} products. Total so far: {len(nodes)}")
    return nodes

def parse_products(nodes: List[dict]) -> List[list]:
    return [parse_product(node).to_list() for node in nodes]

# UPLOAD

def update_mrlycdn(data: dict):
    body = json.dumps(data, separators=(',', ':'))
    logger.info(f"Uploading: {s3_url(OUTPUT_FILE, MRLYCDN_BUCKET)}")
    put_json(OUTPUT_FILE, body, MRLYCDN_BUCKET, cache_control=CACHE_CONTROL)
    logger.info(f"Uploaded: https://cdn.mrly.net/{OUTPUT_FILE}")

# DELETE

def shopify_request(token, query, variables=None):
    payload = {"query": query, "variables": variables}
    logger.info(f"shopify_request: {payload}")
    headers = {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": token,
    }
    response = requests.post(ADMIN_API_URL, json=payload, headers=headers)
    if response.status_code != 200:
        raise Exception(f"Shopify request error: {response.status_code}")
    result = response.json()
    logger.info(f"shopify_result: {result}")
    if "errors" in result:
        raise Exception(f"GraphQL error: {result['errors']}")
    return result["data"]

def delete_product():
    token = get_admin_token()
    cutoff = (datetime.now(timezone.utc) - timedelta(days=DAYS_OLD_DELETE)).strftime("%Y-%m-%d")
    logger.info(f"Looking for products created before {cutoff}")
    data = shopify_request(token, QUERY_OLDEST_PRODUCT, {"query": f"created_at:<{cutoff}"})
    nodes = data["products"]["nodes"]
    if not nodes:
        logger.info("No old products to delete.")
        return
    shopify_id = nodes[0]["id"]
    handle = nodes[0]["handle"]
    variables = {"input": {"id": shopify_id}}
    response = shopify_request(token, MUTATION_DELETE_PRODUCT, variables)
    if response["productDelete"]["userErrors"]:
        raise Exception(f"Shopify deletion errors: {response['productDelete']['userErrors']}")
    deleted_id = response["productDelete"]["deletedProductId"]
    logger.info(f"Deleted from Shopify: {deleted_id}")
    delete_folder(f"mrlyshop/tasks/{handle}/", MRLYCDN_BUCKET)
    logger.info(f"Deleted from MRLYCDN: mrlyshop/tasks/{handle}/")
    delete_folder(f"tasks/{handle}/", MRLYSHOP_BUCKET)
    logger.info(f"Deleted from MRLYSHOP: tasks/{handle}/")

# TEST

def create_test_json():
    from utils.helpers import save_json
    logger.info("Running test...")
    headers = {
        "Content-Type": "application/json",
        "X-Shopify-Storefront-Access-Token": SHOPIFY_STOREFRONT_TOKEN
    }
    params = VARIABLES.copy()
    params["first"] = 5
    payload = {"query": QUERY, "variables": params}
    logger.info(f"POST {STOREFRONT_API_URL}")
    response = requests.post(STOREFRONT_API_URL, json=payload, headers=headers)
    response.raise_for_status()
    data = response.json()
    fp = os.path.join(ROOT, "data/storefront/test.json")
    save_json(fp, data)
    logger.info(f"Saved: {fp}")

def download_data_json():
    from utils.helpers import save_json
    logger.info(f"Downloading: {s3_url(OUTPUT_FILE, MRLYCDN_BUCKET)}")
    data = get_json(OUTPUT_FILE, MRLYCDN_BUCKET)
    fp = os.path.join(ROOT, "data/storefront/data.json")
    save_json(fp, data)
    logger.info(f"Saved: {fp}")

# RUN

def run():
    nodes = fetch_products()
    products = parse_products(nodes)
    if not products:
        logger.info("No products found. Exiting.")
        return True
    recent_cutoff = datetime.now(timezone.utc) - timedelta(hours=HOURS_RECENT)
    most_recent = datetime.fromisoformat(products[0][3].replace("Z", "+00:00"))
    if most_recent < recent_cutoff:
        logger.info(f"Most recent product is from {products[0][3]}.")
        logger.info(f"No activity in past {HOURS_RECENT} hours. Exiting.")
        return True
    output_data = {"timestamp": int(time.time() * 1000), "data": products}
    update_mrlycdn(output_data)
    delete_product()
    return True

# HANDLER

def handler(event, context):
    try:
        run()
    except Exception as e:
        logger.info(f"Error: {e}")
        raise e

# MAIN

def main():
    pass
    run()

if __name__ == "__main__":
    main()
