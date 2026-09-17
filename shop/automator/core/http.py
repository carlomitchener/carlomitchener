import json
import socket
import time
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen
from .errors import Retry

TIMEOUT = 30
TRIES = 3
BACKOFF = [1, 2, 4]
RETRY_AFTER_MAX = 15

class Response:

    def __init__(self, status_code: int, body, headers: dict = None):
        self.status_code = status_code
        self._body = body
        self.headers = headers or {}

    @property
    def text(self) -> str:
        return self._body.decode() if isinstance(self._body, bytes) else self._body

    def json(self) -> dict:
        return json.loads(self._body)

    @property
    def retry_after(self) -> float:
        value = self.headers.get("Retry-After") or self.headers.get("retry-after")
        try:
            return float(value)
        except (TypeError, ValueError):
            return None

def request(method: str, url: str, headers: dict = None, data: dict = None, json_data=None) -> Response:
    headers = dict(headers) if headers else {}
    body = None
    if json_data is not None:
        body = json.dumps(json_data).encode()
        headers.setdefault("Content-Type", "application/json")
    elif data is not None:
        body = urlencode(data).encode()
        headers.setdefault("Content-Type", "application/x-www-form-urlencoded")
    for attempt in range(TRIES):
        last = attempt == TRIES - 1
        req = Request(url, data=body, headers=headers, method=method)
        try:
            response = urlopen(req, timeout=TIMEOUT)
            return Response(response.status, response.read(), dict(response.headers))
        except HTTPError as error:
            response = Response(error.code, error.read(), dict(error.headers))
            if error.code == 429 and not last and response.retry_after is not None and response.retry_after <= RETRY_AFTER_MAX:
                time.sleep(response.retry_after)
                continue
            if error.code >= 500 and not last:
                time.sleep(BACKOFF[attempt])
                continue
            return response
        except (URLError, socket.timeout, TimeoutError, OSError) as error:
            if not last:
                time.sleep(BACKOFF[attempt])
                continue
            raise Retry(f"{type(error).__name__} on {method} {url}")
