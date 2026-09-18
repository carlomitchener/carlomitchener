import time
from automator.core.api import check_errors, extract_gid, logger, printful_request, shopify_request
from automator.core.config import PREVIEW_BUDGET
from automator.core.errors import Retry, TaskAborted
from automator.core.models import Task
from automator.core.steps import Step

PRINTFUL_SYNC_URL = "sync/products/@"
PREVIEW_TYPE = "preview"
STYLE = "preview"
ERRORS = "mediaUserErrors"

CREATE = """
mutation productCreateMedia($productId: ID!, $media: [CreateMediaInput!]!) {
    productCreateMedia(productId: $productId, media: $media) {
        media {
            ... on MediaImage {
                id
                fileStatus
            }
        }
        mediaUserErrors {
            field
            message
        }
    }
}
"""

REORDER = """
mutation productReorderMedia($id: ID!, $moves: [MoveInput!]!) {
    productReorderMedia(id: $id, moves: $moves) {
        job {
            id
            done
        }
        mediaUserErrors {
            field
            message
        }
    }
}
"""

STATUS = """
query previewStatus($id: ID!) {
    node(id: $id) {
        ... on MediaImage {
            fileStatus
        }
    }
}
"""

def waited(task: Task) -> int:
    since = task.metadata.setdefault("waiting_since", int(time.time()))
    return int(time.time()) - since

def skip(task: Task, reason: str) -> Task:
    logger.warning(f"{task.desc} preview skipped: {reason}")
    return advance(task)

def advance(task: Task) -> Task:
    task.metadata.pop("waiting_since", None)
    task.metadata.pop("preview_media", None)
    task.place(Step.PUBLISH)
    return task

def find_preview(task: Task) -> str | None:
    shopify_id = extract_gid(task.product.shopify_id)
    result = printful_request(task, "GET", f"{PRINTFUL_SYNC_URL}{shopify_id}")
    for variant in result["result"]["sync_variants"]:
        for file in variant.get("files") or []:
            if file.get("type") == PREVIEW_TYPE and file.get("status") == "ok" and file.get("preview_url"):
                return file["preview_url"]
    return None

def alt(task: Task) -> str:
    return f"{STYLE} - Preview - {task.product.title}"

def create_media(task: Task, url: str) -> str:
    media = [{"originalSource": url, "alt": alt(task), "mediaContentType": "IMAGE"}]
    result = shopify_request(task, CREATE, {"productId": task.product.shopify_id, "media": media})
    data = check_errors(result, "productCreateMedia", ERRORS)
    return data["media"][0]["id"]

def media_status(task: Task, media_id: str) -> str | None:
    result = shopify_request(task, STATUS, {"id": media_id})
    node = result["data"]["node"] or {}
    return node.get("fileStatus")

def reorder(task: Task, media_id: str) -> None:
    moves = [{"id": media_id, "newPosition": "0"}]
    result = shopify_request(task, REORDER, {"id": task.product.shopify_id, "moves": moves})
    check_errors(result, "productReorderMedia", ERRORS)

def request_preview(task: Task) -> Task:
    url = find_preview(task)
    if not url:
        if waited(task) > PREVIEW_BUDGET:
            return skip(task, "printful preview not ready")
        raise Retry(f"printful preview not ready, waited {waited(task)}/{PREVIEW_BUDGET} s")
    try:
        task.metadata["preview_media"] = create_media(task, url)
    except TaskAborted as error:
        return skip(task, str(error))
    raise Retry(f"preview media {task.metadata['preview_media']} requested")

def place_preview(task: Task, media_id: str) -> Task:
    status = media_status(task, media_id)
    if status == "FAILED":
        return skip(task, "shopify preview media failed")
    if status != "READY":
        if waited(task) > PREVIEW_BUDGET:
            return skip(task, f"shopify preview media {status}")
        raise Retry(f"preview media {status}, waited {waited(task)}/{PREVIEW_BUDGET} s")
    try:
        reorder(task, media_id)
    except TaskAborted as error:
        return skip(task, str(error))
    logger.info(f"{task.desc} preview media {media_id} leads the product")
    return advance(task)

def mrly_preview(task: Task) -> Task:
    media_id = task.metadata.get("preview_media")
    if not media_id:
        return request_preview(task)
    return place_preview(task, media_id)

if __name__ == "__main__":
    from automator.core.api import mint_token
    from automator.core.s3 import load_task, save_task
    mint_token()
    task = load_task()
    try:
        task = mrly_preview(task)
    except Retry as note:
        print(note)
    save_task(task)
    print(task.key, task.step)
