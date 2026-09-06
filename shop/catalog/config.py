from env import load_env, need

load_env()

# AWS

CARLOMITCHENER_BUCKET = need("CARLOMITCHENER_BUCKET")

# PRINTFUL

PRINTFUL_API_KEY = need("PRINTFUL_API_KEY")
PRINTFUL_URL = "https://api.printful.com"
DELAY = 0.6
