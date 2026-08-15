from mrlycloud import requests
from mrlycore.helpers import hex_key, random_seed, create_logger
from mrlycloud.shopify import get_admin_token
from .config import PRINTFUL_API_KEY, PRINTFUL_BASE_URL, SHOPIFY_SHOP_URL
from .errors import Retry, PrintfulError, ShopifyError
from .models import Task

def extract_gid(gid: str) -> str:
    return gid.split("/")[-1]

logger = create_logger("mrlyshop-automator")

def printful_request(task: Task, method: str, url: str, data: dict = None) -> dict:
    url = f"{PRINTFUL_BASE_URL}{url}"
    logger.info(f"{task.desc} printful_request {url}")
    headers = {"Authorization": f"Bearer {PRINTFUL_API_KEY}"}
    if data:
        logger.info(f"{task.desc} printful_payload {data}")
    response = requests.request(
        method=method,
        url=url,
        headers=headers,
        json_data=data
    )
    if response.status_code == 429:
        raise Retry("Too many requests")
    if response.status_code == 400:
        return {}
    if response.status_code == 404:
        return {}
    if response.status_code != 200:
        raise PrintfulError()
    result = response.json()
    logger.info(f"{task.desc} printful_response {result}")
    return result

def shopify_request(task: Task, query: str, variables: dict = None) -> dict:
    url = SHOPIFY_SHOP_URL
    logger.info(f"{task.desc} shopify_request {url}")
    headers = {"X-Shopify-Access-Token": task.shopify_token}
    payload = {"query": query, "variables": variables}
    logger.info(f"{task.desc} shopify_payload {payload}")
    response = requests.post(
        url=url,
        json=payload,
        headers=headers
    )
    if response.status_code == 429:
        raise Retry("Too many requests")
    if response.status_code != 200:
        raise ShopifyError()
    result = response.json()
    logger.info(f"{task.desc} shopify_response {result}")
    if "errors" in result:
        raise ShopifyError()
    return result
