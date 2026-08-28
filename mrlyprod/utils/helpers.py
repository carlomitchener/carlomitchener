import json
import os

# ENV

def load_env(path: str = None):
    path = path or os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", ".env")
    if not os.path.exists(path): return
    with open(path) as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#"): continue
            key, _, value = line.partition("=")
            os.environ.setdefault(key.strip(), value.strip())

# JSON

def load_json(path: str) -> dict:
    with open(path, "r") as f:
        return json.load(f)

def save_json(path: str, data, indent: int = 2):
    parent = os.path.dirname(path)
    if parent:
        os.makedirs(parent, exist_ok=True)
    with open(path, "w") as f:
        json.dump(data, f, indent=indent)
