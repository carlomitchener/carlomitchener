import json
import os
from utils.boto import put_file, put_json

from utils.helpers import load_env

load_env()

ROOT_DIR = os.path.dirname(os.path.abspath(__file__))
FILES_DIR = os.path.join(ROOT_DIR, "files")

MRLYCDN_BUCKET = os.environ["MRLYCDN_BUCKET"]
CDN_PREFIX = "mrlyshop/files"
CACHE_CONTROL = "max-age=900"

# PRODUCTS

def upload_products():
    with open(os.path.join(FILES_DIR, "catalog.json")) as f:
        catalog = json.load(f)
    with open(os.path.join(FILES_DIR, "dictionary.json")) as f:
        dictionary = json.load(f)
    link_map = {str(item["id"]): item["link"] for item in catalog}
    products = {}
    for product_id, value in dictionary.items():
        link = link_map.get(product_id, "")
        products[product_id] = f"{value}, {link}" if link else value
    body = json.dumps(products, indent=2)
    key = f"{CDN_PREFIX}/products.json"
    put_json(key, body, MRLYCDN_BUCKET, cache_control=CACHE_CONTROL)
    print(f"Uploaded: https://cdn.mrly.net/{key}")

if __name__ == "__main__":
    upload_products()
