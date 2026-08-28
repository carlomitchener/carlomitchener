import json
from urllib.request import urlopen, Request
from urllib.parse import urlencode

class HTTPError(Exception):
    def __init__(self, status_code, body):
        self.status_code = status_code
        self.body = body
        super().__init__(f"HTTP {status_code}: {body[:200]}")

class Response:
    def __init__(self, status_code, body):
        self.status_code = status_code
        self._body = body
    @property
    def text(self):
        return self._body.decode() if isinstance(self._body, bytes) else self._body
    def json(self):
        return json.loads(self._body)
    def raise_for_status(self):
        if self.status_code >= 400:
            raise HTTPError(self.status_code, self.text)

def request(method, url, headers=None, data=None, json_data=None, timeout=10):
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
        res = urlopen(req, timeout=timeout)
        return Response(res.status, res.read())
    except Exception as e:
        if hasattr(e, "status"):
            return Response(e.status, e.read())
        raise

def get(url, headers=None, timeout=10):
    return request("GET", url, headers=headers, timeout=timeout)

def post(url, headers=None, data=None, json=None, timeout=10):
    return request("POST", url, headers=headers, data=data, json_data=json, timeout=timeout)
