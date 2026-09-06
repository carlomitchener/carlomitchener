import json
from mrlypy.core.helpers import create_logger
from . import http
from .config import (
    PRINTFUL_API_KEY,
    PRINTFUL_URL,
    SHOPIFY_ADMIN_URL,
    SHOPIFY_AUTH_URL,
    SHOPIFY_CLIENT_ID,
    SHOPIFY_SECRET,
)
from .errors import PrintfulError, Retry, ShopifyError, TaskAborted
from .models import Task

BODY_LIMIT = 300

logger = create_logger("carlomitchener-automator")

TOKEN = {"admin": None}

def extract_gid(gid: str) -> str:
    return gid.split("/")[-1]

def clip(text: str) -> str:
    return text[:BODY_LIMIT].replace("\n", " ")

def log(task: Task, method: str, url: str, status: int) -> None:
    logger.info(f"{task.desc} {task.step} {method} {url} {status}")

# TOKEN

def mint_token() -> None:
    payload = {
        "client_id": SHOPIFY_CLIENT_ID,
        "client_secret": SHOPIFY_SECRET,
        "grant_type": "client_credentials",
    }
    response = http.request("POST", SHOPIFY_AUTH_URL, data=payload)
    if response.status_code != 200:
        raise ShopifyError(f"admin token {response.status_code}")
    result = response.json()
    if "access_token" not in result:
        raise ShopifyError("admin token refused")
    TOKEN["admin"] = result["access_token"]
    logger.info(f"admin token minted for {SHOPIFY_ADMIN_URL}")

# PRINTFUL

def printful_request(task: Task, method: str, path: str, data: dict = None, allow_404: bool = False) -> dict:
    url = f"{PRINTFUL_URL}{path}"
    headers = {"Authorization": f"Bearer {PRINTFUL_API_KEY}"}
    response = http.request(method, url, headers=headers, json_data=data)
    log(task, method, url, response.status_code)
    if response.status_code == 429:
        raise Retry("printful 429")
    if response.status_code == 400:
        raise TaskAborted(f"printful 400 {clip(response.text)}")
    if response.status_code == 404:
        if allow_404:
            return {}
        raise TaskAborted(f"printful 404 {clip(response.text)}")
    if response.status_code != 200:
        raise PrintfulError(f"printful {response.status_code} {clip(response.text)}")
    return response.json()

# SHOPIFY

def shopify_request(task: Task, query: str, variables: dict = None) -> dict:
    headers = {"X-Shopify-Access-Token": TOKEN["admin"]}
    payload = {"query": query, "variables": variables}
    response = http.request("POST", SHOPIFY_ADMIN_URL, headers=headers, json_data=payload)
    log(task, "POST", SHOPIFY_ADMIN_URL, response.status_code)
    if response.status_code == 429:
        raise Retry("shopify 429")
    if response.status_code != 200:
        raise ShopifyError(f"shopify {response.status_code}")
    result = response.json()
    if "errors" in result:
        raise ShopifyError(f"shopify errors {clip(json.dumps(result['errors']))}")
    return result

def check_errors(result: dict, name: str) -> dict:
    data = result["data"][name]
    errors = data["userErrors"]
    if errors:
        raise TaskAborted(f"{name} userErrors {clip(json.dumps(errors))}")
    return data

DELETE_PRODUCT = """
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

def delete_product(task: Task) -> None:
    variables = {"input": {"id": task.product.shopify_id}}
    result = shopify_request(task, DELETE_PRODUCT, variables)
    check_errors(result, "productDelete")
    logger.info(f"{task.desc} deleted shopify product {task.product.shopify_id}")
