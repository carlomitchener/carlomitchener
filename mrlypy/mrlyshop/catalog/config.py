import os
from mrlycloud.helpers import load_env

load_env()

# AWS
MRLYSHOP_BUCKET = os.environ["MRLYSHOP_BUCKET"]

# PRINTFUL
PRINTFUL_API_KEY = os.environ["PRINTFUL_API_KEY"]
PRINTFUL_URL = "https://api.printful.com"
