import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
SHOP = os.path.dirname(HERE)
sys.path.append(SHOP)
from env import load_env, need

load_env()

# PATHS

DATA_DIR = os.path.join("data", os.path.relpath(HERE))
RAW = os.path.join(DATA_DIR, "raw")
FILES = os.path.join(SHOP, "files")
CATALOG = os.path.join(FILES, "catalog.json")
DICTIONARY = os.path.join(FILES, "dictionary.json")
PRODUCTS = os.path.join(FILES, "products")
REVIEWS = os.path.join(FILES, "reviews.json")

# AWS

BUCKET = need("CARLOMITCHENER_BUCKET")

# PRINTFUL

PRINTFUL_API_KEY = need("PRINTFUL_API_KEY")
PRINTFUL_URL = "https://api.printful.com"
DELAY = 0.6
