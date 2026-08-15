import os
from mrlycloud import requests

from .helpers import load_env

load_env()

SHOPIFY_CLIENT_ID = os.environ["SHOPIFY_CLIENT_ID"]
SHOPIFY_CLIENT_SECRET = os.environ["SHOPIFY_CLIENT_SECRET"]

SHOPIFY_SHOP = "1332b7-26.myshopify.com"
SHOPIFY_STOREFRONT_TOKEN = "67e9b0e452171fa81c94b94ecba26742"

API_VERSION = "2026-01"
ADMIN_API_URL = f"https://{SHOPIFY_SHOP}/admin/api/{API_VERSION}/graphql.json"
AUTH_URL = f"https://{SHOPIFY_SHOP}/admin/oauth/access_token"

TOKEN_TITLE = "mrlynet"

def get_admin_token() -> str:
    url = AUTH_URL
    payload = {
        "client_id": SHOPIFY_CLIENT_ID,
        "client_secret": SHOPIFY_CLIENT_SECRET,
        "grant_type": "client_credentials",
    }
    response = requests.post(url, data=payload)
    if response.status_code != 200:
        raise Exception(f"Failed to get admin token: {response.status_code}")
    result = response.json()
    if "access_token" not in result:
        raise Exception(f"Failed to get admin token: {result}")
    return result["access_token"]

def graphql(token, query, variables=None):
    url = ADMIN_API_URL
    payload = {
        "query": query,
        "variables": variables,
    }
    headers = {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": token,
    }
    response = requests.post(url, json=payload, headers=headers)
    if response.status_code != 200:
        raise Exception(f"GraphQL error: {response.status_code}")
    result = response.json()
    if "errors" in result:
        raise Exception(f"GraphQL error: {result['errors']} {result['message']}")
    return result["data"]

LIST_STOREFRONT_TOKENS_QUERY = """
{
    shop {
        storefrontAccessTokens(first: 100) {
            edges { node { id title } }
        }
    }
}
"""

DELETE_STOREFRONT_TOKEN_MUTATION = """
mutation($id: ID!) {
    storefrontAccessTokenDelete(input: { id: $id }) {
        userErrors { field message }
    }
}
"""

CREATE_STOREFRONT_TOKEN_MUTATION = """
mutation($input: StorefrontAccessTokenInput!) {
    storefrontAccessTokenCreate(input: $input) {
        storefrontAccessToken { accessToken accessScopes { handle } }
        userErrors { field message }
    }
}
"""

LIST_PRODUCTS_QUERY = """
query($cursor: String) {
    products(first: 250, after: $cursor) {
        pageInfo { hasNextPage endCursor }
        nodes { id }
    }
}
"""

DELETE_PRODUCT_MUTATION = """
mutation($input: ProductDeleteInput!) {
    productDelete(input: $input) {
        deletedProductId
        userErrors { field message }
    }
}
"""

def delete_all_products():
    print("Authenticating...")
    token = get_admin_token()
    print("Fetching all products...")
    product_ids = []
    cursor = None
    has_next_page = True
    while has_next_page:
        data = graphql(token, LIST_PRODUCTS_QUERY, {"cursor": cursor})
        products = data["products"]
        for node in products["nodes"]:
            product_ids.append(node["id"])
        has_next_page = products["pageInfo"]["hasNextPage"]
        cursor = products["pageInfo"]["endCursor"]
    print(f"Found {len(product_ids)} products.")
    for i, product_id in enumerate(product_ids):
        data = graphql(token, DELETE_PRODUCT_MUTATION, {"input": {"id": product_id}})
        result = data["productDelete"]
        if result["userErrors"]:
            print(f"Error deleting {product_id}: {result['userErrors']}")
            continue
        print(f"Deleted {result['deletedProductId']} ({i + 1}/{len(product_ids)})")
    print("Done.")

def delete_existing_tokens(token):
    data = graphql(token, LIST_STOREFRONT_TOKENS_QUERY)
    edges = data["shop"]["storefrontAccessTokens"]["edges"]
    for edge in edges:
        node = edge["node"]
        print(f"Deleting token: {node['title']} ({node['id']})")
        graphql(token, DELETE_STOREFRONT_TOKEN_MUTATION, {"id": node["id"]})

def create_storefront_token(token):
    variables = {"input": {"title": TOKEN_TITLE}}
    data = graphql(token, CREATE_STOREFRONT_TOKEN_MUTATION, variables)
    result = data["storefrontAccessTokenCreate"]
    if result["userErrors"]:
        raise Exception(f"Error creating storefront token: {result['userErrors']}")
    return result["storefrontAccessToken"]["accessToken"]

def rotate_storefront_token():
    print("Authenticating...")
    admin_token = get_admin_token()
    print("Deleting existing storefront tokens...")
    delete_existing_tokens(admin_token)
    print(f"Creating new storefront token ({TOKEN_TITLE})...")
    storefront_token = create_storefront_token(admin_token)
    print(f'SHOPIFY_STOREFRONT_TOKEN = "{storefront_token}"')
    print(f'SHOPIFY_STOREFRONT_TOKEN={storefront_token}')
