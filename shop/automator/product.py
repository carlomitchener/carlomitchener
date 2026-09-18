from automator.core.api import check_errors, shopify_request
from automator.core.errors import Retry, TaskAborted
from automator.core.models import Task, Variant
from automator.core.steps import Step

VENDOR = "Printful"
CATEGORY = "gid://shopify/TaxonomyCategory/na"

MUTATION = """
mutation productSet($input: ProductSetInput!, $identifier: ProductSetIdentifiers!, $synchronous: Boolean!) {
    productSet(synchronous: $synchronous, identifier: $identifier, input: $input) {
        product {
            id
            variants(first: 100) {
                nodes {
                    id
                    sku
                }
            }
        }
        userErrors {
            field
            message
        }
    }
}
"""

def set_tags(task: Task) -> list[str]:
    tags = [task.product.category.capitalize(), task.product.title, f"design:{task.design}"]
    group = (task.variation.get("tile") or {}).get("group")
    if group:
        tags.append(f"group:{group}")
    if task.paint.get("primary"):
        tags.append(f"primary:{task.paint['primary']}")
    for ink in task.paint.get("secondary") or []:
        tags.append(f"secondary:{ink}")
    return tags

def set_sizes(task: Task) -> list[str]:
    sizes = []
    for variant in task.variants:
        if variant.size not in sizes:
            sizes.append(variant.size)
    return sizes

def set_product_options(task: Task) -> list[dict]:
    values = [{"name": size} for size in set_sizes(task)]
    return [{"name": "Size", "position": 1, "values": values}]

def variant_payload(variant: Variant) -> dict:
    return {
        "inventoryItem": {"requiresShipping": True, "tracked": False},
        "optionValues": [{"optionName": "Size", "name": variant.size}],
        "price": variant.cost,
        "sku": variant.name,
        "taxable": False,
    }

def product_payload(task: Task) -> dict:
    return {
        "category": CATEGORY,
        "descriptionHtml": "",
        "files": [{"id": m.shopify_id} for m in task.mockups],
        "handle": task.key,
        "productOptions": set_product_options(task),
        "productType": str(task.product.id),
        "status": "ACTIVE",
        "tags": set_tags(task),
        "title": f"{task.product.title} ({task.design})",
        "variants": [variant_payload(v) for v in task.variants],
        "vendor": VENDOR,
    }

def create_product(task: Task) -> dict:
    variables = {"input": product_payload(task), "identifier": {"handle": task.key}, "synchronous": True}
    result = shopify_request(task, MUTATION, variables)
    return check_errors(result, "productSet")

def parse_result(task: Task, data: dict) -> Task:
    product = data["product"]
    task.product.shopify_id = product["id"]
    variants = {node["sku"]: node["id"] for node in product["variants"]["nodes"]}
    for variant in task.variants:
        if variant.name not in variants:
            raise TaskAborted(f"shopify lost variant {variant.name}")
        variant.shopify_id = variants[variant.name]
    return task

def mrly_product(task: Task) -> Task:
    task = parse_result(task, create_product(task))
    task.place(Step.PING)
    raise Retry(f"shopify product {task.product.shopify_id} set")

if __name__ == "__main__":
    from automator.core.api import mint_token
    from automator.core.s3 import load_task, save_task
    mint_token()
    task = load_task()
    try:
        mrly_product(task)
    except Retry as note:
        print(note)
    save_task(task)
