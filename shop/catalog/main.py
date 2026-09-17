from check import check_catalog, check_products, report
from correct import correct_products
from fetch import fetch_products, load_raw_catalog
from helpers import all_ids, create_dictionary, sort_catalog
from parse import parse_products
from s3 import upload_products
from sort import sort_products

if __name__ == "__main__":
    ids = all_ids()
    sort_catalog()
    create_dictionary()
    report("catalog", check_catalog(load_raw_catalog()))
    fetch_products(ids)
    parse_products(ids)
    sort_products(ids)
    correct_products(ids)
    report("products", check_products(ids))
    upload_products(ids)
