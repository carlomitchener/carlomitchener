import base64
import json
import os
import sys
import zipfile
from common import (
    AUTOMATOR_NAME,
    REPO,
    SITE_URL,
    aws,
    gate,
    maybe,
    need,
    save_env,
    say,
    stream,
    tmpfile,
    verb,
)

BUILD_DIR = os.path.join(REPO, "data", "functions")
FILE_MODE = 0o644 << 16
SKIP = ("__pycache__", ".pyc", ".DS_Store")

MRLYPY = ["core", "gen", "paint", "tile", "two", "three", "six"]

FUNCTIONS = {
    "automator": {
        "name": AUTOMATOR_NAME,
        "handler": "handler.handler",
        "runtime": "python3.13",
        "arch": "arm64",
        "memory": 4096,
        "timeout": 180,
        "storage": 512,
        "concurrency": 1,
        "retries": 0,
        "retention": 14,
        "layers": ["PILLOW_LAYER_ARN", "NUMPY_LAYER_ARN"],
        "env": [
            "CARLOMITCHENER_BUCKET",
            "PRINTFUL_API_KEY",
            "SHOPIFY_SHOP_URL",
            "SHOPIFY_CLIENT_ID",
            "SHOPIFY_SECRET",
            "SHOPIFY_ONLINE_STORE_ID",
            "SHOPIFY_HEADLESS_ID",
        ],
        "env_arn": "AUTOMATOR_FUNCTION",
    },
}

# PACKAGE

def package_path(key):
    return os.path.join(BUILD_DIR, f"{key}.zip")

def sources(key):
    shop = os.path.join(REPO, "shop")
    items = [
        (os.path.join(shop, "handler.py"), "handler.py"),
        (os.path.join(shop, "automator"), "automator"),
    ]
    for name in MRLYPY:
        items.append((os.path.join(REPO, "mrlypy", name), f"mrlypy/{name}"))
    items.append((os.path.join(REPO, "mrlypy", "__init__.py"), "mrlypy/__init__.py"))
    return items

def skipped(name):
    return any(mark in name for mark in SKIP)

def add(archive, full, arc):
    if skipped(arc): return 0
    info = zipfile.ZipInfo(arc, (1980, 1, 1, 0, 0, 0))
    info.external_attr = FILE_MODE
    info.compress_type = zipfile.ZIP_DEFLATED
    with open(full, "rb") as handle:
        archive.writestr(info, handle.read())
    return 1

def package(key):
    os.makedirs(BUILD_DIR, exist_ok=True)
    path = package_path(key)
    if os.path.exists(path): os.remove(path)
    count = 0
    with zipfile.ZipFile(path, "w", zipfile.ZIP_DEFLATED) as archive:
        for source, arc in sources(key):
            if os.path.isfile(source):
                count += add(archive, source, arc)
                continue
            for folder, _, files in sorted(os.walk(source)):
                for file in sorted(files):
                    full = os.path.join(folder, file)
                    inner = os.path.relpath(full, source)
                    count += add(archive, full, f"{arc}/{inner}")
    size = os.path.getsize(path) / 1e6
    say(f"packaged {count} files into {path} ({size:.1f} MB)")
    return path

# STATE

def configuration(name):
    return maybe("lambda", "get-function-configuration", "--function-name", name)

def layer_arns(spec):
    return [need(key) for key in spec["layers"]]

def variables(spec):
    data = {key: need(key) for key in spec["env"]}
    data["SITE_URL"] = SITE_URL
    return data

def env_file(spec):
    return tmpfile(json.dumps({"Variables": variables(spec)}), ".json")

def log_group(spec):
    return f"/aws/lambda/{spec['name']}"

# DEPLOY

def settle(spec, path, exists):
    variables_path = env_file(spec)
    try:
        if exists:
            aws(
                "lambda", "update-function-code",
                "--function-name", spec["name"],
                "--zip-file", f"fileb://{path}",
            )
            aws("lambda", "wait", "function-updated-v2", "--function-name", spec["name"])
            aws(
                "lambda", "update-function-configuration",
                "--function-name", spec["name"],
                "--role", need("ROLE_ARN"),
                "--handler", spec["handler"],
                "--runtime", spec["runtime"],
                "--memory-size", spec["memory"],
                "--timeout", spec["timeout"],
                "--ephemeral-storage", f"Size={spec['storage']}",
                "--environment", f"file://{variables_path}",
                "--layers", *layer_arns(spec),
                "--logging-config", "LogFormat=JSON,ApplicationLogLevel=INFO,SystemLogLevel=INFO",
            )
            aws("lambda", "wait", "function-updated-v2", "--function-name", spec["name"])
        else:
            data = aws(
                "lambda", "create-function",
                "--function-name", spec["name"],
                "--role", need("ROLE_ARN"),
                "--handler", spec["handler"],
                "--runtime", spec["runtime"],
                "--architectures", spec["arch"],
                "--zip-file", f"fileb://{path}",
                "--memory-size", spec["memory"],
                "--timeout", spec["timeout"],
                "--ephemeral-storage", f"Size={spec['storage']}",
                "--environment", f"file://{variables_path}",
                "--layers", *layer_arns(spec),
                "--logging-config", "LogFormat=JSON,ApplicationLogLevel=INFO,SystemLogLevel=INFO",
            )
            aws("lambda", "wait", "function-active-v2", "--function-name", spec["name"])
            save_env(spec["env_arn"], data["FunctionArn"])
    finally:
        os.remove(variables_path)

def guards(spec):
    aws(
        "lambda", "put-function-event-invoke-config",
        "--function-name", spec["name"],
        "--maximum-retry-attempts", spec["retries"],
    )
    aws(
        "lambda", "put-function-concurrency",
        "--function-name", spec["name"],
        "--reserved-concurrent-executions", spec["concurrency"],
    )
    maybe("logs", "create-log-group", "--log-group-name", log_group(spec))
    aws(
        "logs", "put-retention-policy",
        "--log-group-name", log_group(spec),
        "--retention-in-days", spec["retention"],
    )

def deploy():
    key = need_key()
    spec = FUNCTIONS[key]
    exists = configuration(spec["name"]) is not None
    steps = [
        f"package shop/handler.py, shop/automator/, mrlypy/{{{','.join(MRLYPY)}}}",
        f"{'update' if exists else 'create'} {spec['name']} on {spec['runtime']} {spec['arch']}",
        f"memory {spec['memory']} MB, timeout {spec['timeout']} s, storage {spec['storage']} MB",
        f"layers {' '.join(spec['layers'])}, env {len(spec['env']) + 1} keys, JSON logs INFO",
        f"retries {spec['retries']}, reserved concurrency {spec['concurrency']}, retention {spec['retention']} days",
    ]
    if not gate(f"fn deploy {key}", steps): return
    path = package(key)
    settle(spec, path, exists)
    guards(spec)
    say(f"deployed {spec['name']}")

# READ

def show():
    for key, spec in FUNCTIONS.items():
        found = configuration(spec["name"])
        if not found:
            say(f"{key:<12} {spec['name']:<28} none yet")
            continue
        say(f"{key:<12} {spec['name']:<28} {found['State']} {found['MemorySize']} MB {found['Timeout']} s")
        say(f"{'':<12} {found['Runtime']} {found['Architectures']} {found['LastModified']}")

def config():
    spec = FUNCTIONS[need_key()]
    found = configuration(spec["name"])
    if not found:
        raise SystemExit(f"refuse: {spec['name']} does not exist")
    found.get("Environment", {}).pop("Variables", None)
    say(json.dumps(found, indent=2))

def logs():
    spec = FUNCTIONS[need_key()]
    stream("aws", "logs", "tail", log_group(spec), "--since", "20m", "--format", "short")

# INVOKE

def invoke():
    key = need_key()
    spec = FUNCTIONS[key]
    if not gate(f"fn invoke {key}", [f"invoke {spec['name']} once with an empty payload"]): return
    out = tmpfile("", ".json")
    try:
        data = aws(
            "lambda", "invoke",
            "--function-name", spec["name"],
            "--payload", "{}",
            "--cli-binary-format", "raw-in-base64-out",
            "--log-type", "Tail",
            out,
        )
        say(f"status {data['StatusCode']} {data.get('FunctionError', 'ok')}")
        say(base64.b64decode(data["LogResult"]).decode())
        with open(out) as handle:
            say(handle.read())
    finally:
        os.remove(out)

# MAIN

def need_key():
    if len(sys.argv) < 3 or sys.argv[2].startswith("--"):
        raise SystemExit("refuse: function is required (" + " ".join(FUNCTIONS) + ")")
    key = sys.argv[2]
    if key not in FUNCTIONS:
        raise SystemExit(f"refuse: {key} is not a function")
    return key

def package_verb():
    package(need_key())

ACTIONS = {
    "list": show,
    "package": package_verb,
    "deploy": deploy,
    "invoke": invoke,
    "config": config,
    "logs": logs,
}

if __name__ == "__main__":
    ACTIONS[verb(list(ACTIONS))]()
