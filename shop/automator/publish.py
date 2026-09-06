from automator.core.api import check_errors, shopify_request
from automator.core.config import SHOPIFY_HEADLESS_ID, SHOPIFY_ONLINE_STORE_ID
from automator.core.models import Task
from automator.core.steps import Step
from datetime import datetime, timezone

DATETIME_FORMAT = "%Y-%m-%dT%H:%M:%SZ"

MUTATION = """
mutation publishablePublish($id: ID!, $input: [PublicationInput!]!) {
    publishablePublish(id: $id, input: $input) {
        publishable {
            ... on Product {
                id
                status
                publishedAt
            }
        }
        userErrors {
            field
            message
        }
    }
}
"""

CHANNELS = [SHOPIFY_ONLINE_STORE_ID, SHOPIFY_HEADLESS_ID]

def set_input() -> list[dict]:
    now = datetime.now(timezone.utc).strftime(DATETIME_FORMAT)
    return [{"publicationId": one, "publishDate": now} for one in CHANNELS if one]

def mrly_publish(task: Task) -> Task:
    variables = {"id": task.product.shopify_id, "input": set_input()}
    result = shopify_request(task, MUTATION, variables)
    check_errors(result, "publishablePublish")
    task.place(Step.COMPLETE)
    return task
