import time
from config import MRLYSHOP_BUCKET
from helpers import all_ids, load_json, ROOT
from mrlycloud.boto import s3_url, put_json, delete_folder

from typing import List

DELAY = 0.5

def upload_products(ids: List[int]) -> None:
    print(f"Uploading json data for {len(ids)} products")
    for id in ids:
        key = f"products/{id}.json"
        data = load_json(os.path.join(ROOT, f"data/products/{id}.json"))
        print(f"Uploading: {s3_url(key, MRLYSHOP_BUCKET)}")
        put_json(key, data, MRLYSHOP_BUCKET)
        time.sleep(DELAY)
    print(f"Uploaded json data for {len(ids)} products")

def delete_all_products() -> None:
    print(f"Deleting all items from {MRLYSHOP_BUCKET}/products/")
    delete_folder("products/", MRLYSHOP_BUCKET)
    print("Done")

if __name__ == "__main__":
    ids = all_ids()
    upload_products(ids)
