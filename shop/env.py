import json
import os
import sys

# PATHS

SHOP_DIR = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(SHOP_DIR)
DESK = os.path.dirname(REPO)
ENV_PATH = os.path.join(DESK, ".env")
DATA_DIR = os.path.join(SHOP_DIR, "data")

# ENV

def load_env():
    if not os.path.exists(ENV_PATH):
        raise SystemExit(f"refuse: {ENV_PATH} is missing")
    with open(ENV_PATH) as handle:
        for line in handle:
            line = line.strip()
            if not line or line.startswith("#"): continue
            key, _, value = line.partition("=")
            os.environ.setdefault(key.strip(), value.strip())

def env(key, fallback=""):
    return os.environ.get(key) or fallback

def need(key):
    value = env(key)
    if not value:
        raise SystemExit(f"refuse: {key} is not in .env")
    return value

def save_env(key, value):
    if env(key):
        say(f"skip {key}, .env already holds a value")
        return
    with open(ENV_PATH) as handle:
        head = "" if handle.read().endswith("\n") else "\n"
    with open(ENV_PATH, "a") as handle:
        handle.write(f"{head}{key}={value}\n")
    os.environ[key] = value
    say(f"{key} written to .env")

# JSON

def load_json(path):
    with open(path) as handle:
        return json.load(handle)

def save_json(path, data, indent=2):
    parent = os.path.dirname(path)
    if parent:
        os.makedirs(parent, exist_ok=True)
    with open(path, "w") as handle:
        json.dump(data, handle, indent=indent)

# SAY

def say(text=""):
    print(text)

def gate(title, steps):
    say(f"PLAN {title}")
    for step in steps: say(f"  {step}")
    if "--yes" in sys.argv: return True
    say("HOLD rerun with --yes to apply")
    return False

def verb(names):
    word = sys.argv[1] if len(sys.argv) > 1 else ""
    if word not in names:
        say("verbs: " + " ".join(names))
        raise SystemExit(1)
    return word
