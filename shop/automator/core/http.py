import json
import socket
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen
from .errors import Retry

TIMEOUT = 30

class Response:

    def __init__(self, status_code: int, body):
        self.status_code = status_code
        self._body = body

    @property
    def text(self) -> str:
        return self._body.decode() if isinstance(self._body, bytes) else self._body

    def json(self) -> dict:
        return json.loads(self._body)

def request(method: str, url: str, headers: dict = None, data: dict = None, json_data=None) -> Response:
    headers = dict(headers) if headers else {}
    body = None
    if json_data is not None:
        body = json.dumps(json_data).encode()
        headers.setdefault("Content-Type", "application/json")
    elif data is not None:
        body = urlencode(data).encode()
        headers.setdefault("Content-Type", "application/x-www-form-urlencoded")
    req = Request(url, data=body, headers=headers, method=method)
    try:
        response = urlopen(req, timeout=TIMEOUT)
        return Response(response.status, response.read())
    except HTTPError as error:
        return Response(error.code, error.read())
    except (URLError, socket.timeout, TimeoutError) as error:
        raise Retry(f"{type(error).__name__} on {method} {url}")
