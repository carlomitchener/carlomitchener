from core.errors import Retry
from core.helpers import shopify_request
from core.models import Task, Variant
from core.steps import Step

MUTATION = """
mutation productSet($input: ProductSetInput!, $synchronous: Boolean!) {
    productSet(synchronous: $synchronous, input: $input) {
        product {
            id
            variants(first: 25) {
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
    return [
        task.product.category,
        task.product.title
    ]

def set_product_options(task: Task) -> list[dict]:
    sizes = [v.size for v in task.variants]
    return [{"name": "Size", "position": 1, "values": [{"name": size} for size in sizes]}]

def set_option_values(variant: Variant) -> list[dict]:
    return [{"optionName": "Size", "name": variant.size}]

def set_inventory_item() -> dict:
    return {"requiresShipping": True, "tracked": False}

def create_variant_payload(variant: Variant) -> dict:
    return {
        "inventoryItem": set_inventory_item(),
        "optionValues": set_option_values(variant),
        "price": variant.price,
        "sku": variant.name,
        "taxable": False
    }

def set_product_variants(task: Task) -> list[dict]:
    return [create_variant_payload(variant) for variant in task.variants]

def set_product_files(task: Task) -> list[dict]:
    return [{"id": m.shopify_id} for m in task.mockups]

def create_product_payload(task: Task) -> dict:
    return {
        "category": "gid://shopify/TaxonomyCategory/na",
        "descriptionHtml": task.desc,
        "files": set_product_files(task),
        "handle": task.key,
        "productOptions": set_product_options(task),
        "productType": str(task.product.id),
        "status": "ACTIVE",
        "tags": set_tags(task),
        "title": task.desc,
        "variants": set_product_variants(task),
        "vendor": "mrlyprod"
    }

def create_product(task: Task) -> dict:
    payload = create_product_payload(task)
    variables = {"input": payload, "synchronous": True}
    result = shopify_request(
        task=task,
        query=MUTATION,
        variables=variables
    )
    return result

def parse_result(task: Task, result: dict) -> Task:
    data = result["data"]["productSet"]["product"]
    task.product.shopify_id = data["id"]
    variant_nodes = data["variants"]["nodes"]
    variant_map = {node["sku"]: node["id"] for node in variant_nodes}
    for variant in task.variants:
        variant.shopify_id = variant_map[variant.name]
    return task

def mrly_product(task: Task) -> Task:
    result = create_product(task)
    task = parse_result(task, result)
    task.place(Step.PING)
    raise Retry(f"Current: {Step.PRODUCT}. Next: {Step.PING}")

def test_product():
    from core.amazon import load_task, save_task
    task = load_task()
    try: task = mrly_product(task)
    except Retry: save_task(task)

if __name__ == "__main__":
    test_product()
