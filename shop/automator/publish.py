from core.config import SHOPIFY_ONLINE_STORE_ID
from core.helpers import shopify_request
from core.models import Task
from core.steps import Step
from datetime import datetime, timedelta, timezone

DELAY = 1
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

def set_input() -> dict:
    current_time = datetime.now(timezone.utc)
    scheduled_time = current_time + timedelta(minutes=DELAY)
    publish_date = scheduled_time.strftime(DATETIME_FORMAT)
    return [
        {
            "publicationId": SHOPIFY_ONLINE_STORE_ID,
            "publishDate": publish_date
        }
    ]

def mrly_publish(task: Task) -> Task:
    id = task.product.shopify_id
    input = set_input()
    variables = {"id": id, "input": input}
    shopify_request(
        task=task,
        query=MUTATION,
        variables=variables
    )
    task.place(Step.COMPLETE)
    return task

def test_publish():
    from core.amazon import load_task, save_task
    task = load_task()
    task = mrly_publish(task)
    save_task(task)

if __name__ == "__main__":
    test_publish()
