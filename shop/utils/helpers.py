import json
import os

# ENV

def find_env() -> str:
    here = os.path.dirname(os.path.abspath(__file__))
    while here != os.path.dirname(here):
        candidate = os.path.join(here, ".env")
        if os.path.exists(candidate): return candidate
        here = os.path.dirname(here)
    return ""

def load_env(path: str = None):
    path = path or find_env()
    if not path or not os.path.exists(path): return
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
