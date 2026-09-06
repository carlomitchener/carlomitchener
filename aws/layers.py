import json
import os
import shutil
import sys
import zipfile
from common import (
    REPO,
    aws,
    gate,
    maybe,
    need,
    save_env,
    say,
    shell,
    tmpfile,
    verb,
)

PACKAGES = ["pillow", "numpy"]
RUNTIME = "python3.13"
ARCH = "arm64"
PYTHON_VERSION = "3.13"
PLATFORM = "aarch64-manylinux2014"
LAYERS_DIR = os.path.join(REPO, "data", "layers")
ARCH_ELF = 0xB7
PROBE_NAME = "carlomitchener-probe"
FILE_MODE = 0o644 << 16

def layer_name(name):
    return f"carlomitchener-{name}"

def env_key(name):
    return f"{name.upper()}_LAYER_ARN"

def stage_dir(name):
    return os.path.join(LAYERS_DIR, name)

def target_dir(name):
    return os.path.join(stage_dir(name), "python")

def zip_path(name):
    return os.path.join(LAYERS_DIR, f"{name}.zip")

# BUILD

def is_aarch64(path):
    with open(path, "rb") as handle:
        head = handle.read(20)
    return len(head) == 20 and int.from_bytes(head[18:20], "little") == ARCH_ELF

def check_arch(name):
    for root, _, files in os.walk(target_dir(name)):
        for file in files:
            if not file.endswith(".so"): continue
            path = os.path.join(root, file)
            if not is_aarch64(path):
                raise SystemExit(f"refuse: {path} is not aarch64")
            return path
    raise SystemExit(f"refuse: no .so under {target_dir(name)}")

def write_zip(name):
    root = stage_dir(name)
    path = zip_path(name)
    if os.path.exists(path): os.remove(path)
    with zipfile.ZipFile(path, "w", zipfile.ZIP_DEFLATED) as archive:
        for folder, _, files in sorted(os.walk(root)):
            for file in sorted(files):
                full = os.path.join(folder, file)
                arc = os.path.relpath(full, root)
                if "__pycache__" in arc or arc.endswith(".pyc"): continue
                info = zipfile.ZipInfo(arc, (1980, 1, 1, 0, 0, 0))
                info.external_attr = FILE_MODE
                info.compress_type = zipfile.ZIP_DEFLATED
                with open(full, "rb") as handle:
                    archive.writestr(info, handle.read())
    return path

def build():
    name = need_name()
    steps = [
        f"uv pip install {name} for {PLATFORM} into {target_dir(name)}",
        "check one .so is aarch64",
        f"zip {zip_path(name)} with python/ at the root",
    ]
    if not gate(f"layers build {name}", steps): return
    shutil.rmtree(stage_dir(name), ignore_errors=True)
    os.makedirs(target_dir(name), exist_ok=True)
    shell(
        "uv", "pip", "install", name,
        "--python-version", PYTHON_VERSION,
        "--python-platform", PLATFORM,
        "--only-binary", ":all:",
        "--target", target_dir(name),
    )
    say(f"aarch64 ok {os.path.basename(check_arch(name))}")
    path = write_zip(name)
    size = os.path.getsize(path) / 1e6
    say(f"built {path} ({size:.1f} MB)")

# PUBLISH

def publish():
    name = need_name()
    path = zip_path(name)
    if not os.path.exists(path):
        raise SystemExit(f"refuse: {path} is missing, run build first")
    steps = [
        f"publish-layer-version {layer_name(name)} from {path}",
        f"runtime {RUNTIME}, architecture {ARCH}",
        f"save {env_key(name)} to .env",
    ]
    if not gate(f"layers publish {name}", steps): return
    data = aws(
        "lambda", "publish-layer-version",
        "--layer-name", layer_name(name),
        "--zip-file", f"fileb://{path}",
        "--compatible-runtimes", RUNTIME,
        "--compatible-architectures", ARCH,
    )
    say(f"published version {data['Version']}")
    save_env(env_key(name), data["LayerVersionArn"])

# LIST

def versions(name):
    data = maybe("lambda", "list-layer-versions", "--layer-name", layer_name(name))
    return (data or {}).get("LayerVersions") or []

def show():
    for name in PACKAGES:
        found = versions(name)
        if not found:
            say(f"{layer_name(name):<28} none yet")
            continue
        latest = found[0]
        say(f"{layer_name(name):<28} v{latest['Version']} {latest['CompatibleArchitectures']}")
        say(f"{'':<28} {env_key(name)} {'set' if os.environ.get(env_key(name)) else 'missing'}")

# PROBE

PROBE_CODE = """
import boto3
import numpy
from PIL import Image

def handler(event, context):
    return {
        "pillow": Image.__version__ if hasattr(Image, "__version__") else "unknown",
        "numpy": numpy.__version__,
        "boto3": boto3.__version__,
    }
"""

def probe_zip():
    path = os.path.join(LAYERS_DIR, "probe.zip")
    os.makedirs(LAYERS_DIR, exist_ok=True)
    if os.path.exists(path): os.remove(path)
    with zipfile.ZipFile(path, "w", zipfile.ZIP_DEFLATED) as archive:
        info = zipfile.ZipInfo("probe.py", (1980, 1, 1, 0, 0, 0))
        info.external_attr = FILE_MODE
        info.compress_type = zipfile.ZIP_DEFLATED
        archive.writestr(info, PROBE_CODE)
    return path

def probe():
    layers = [need(env_key(name)) for name in PACKAGES]
    steps = [
        f"create {PROBE_NAME} on {RUNTIME} {ARCH} with {len(layers)} layers",
        "invoke it, print the versions",
        f"delete {PROBE_NAME}",
    ]
    if not gate("layers probe", steps): return
    path = probe_zip()
    maybe("lambda", "delete-function", "--function-name", PROBE_NAME)
    aws(
        "lambda", "create-function",
        "--function-name", PROBE_NAME,
        "--runtime", RUNTIME,
        "--architectures", ARCH,
        "--role", need("ROLE_ARN"),
        "--handler", "probe.handler",
        "--zip-file", f"fileb://{path}",
        "--timeout", 30,
        "--memory-size", 512,
        "--layers", *layers,
    )
    aws("lambda", "wait", "function-active-v2", "--function-name", PROBE_NAME)
    out = tmpfile("", ".json")
    try:
        aws(
            "lambda", "invoke",
            "--function-name", PROBE_NAME,
            "--payload", "{}",
            "--cli-binary-format", "raw-in-base64-out",
            out,
        )
        with open(out) as handle:
            say(json.dumps(json.load(handle), indent=2))
    finally:
        os.remove(out)
        aws("lambda", "delete-function", "--function-name", PROBE_NAME)
        say(f"deleted {PROBE_NAME}")

# MAIN

def need_name():
    if len(sys.argv) < 3 or sys.argv[2].startswith("--"):
        raise SystemExit("refuse: name is required (" + " ".join(PACKAGES) + ")")
    name = sys.argv[2]
    if name not in PACKAGES:
        raise SystemExit(f"refuse: {name} is not one of {PACKAGES}")
    return name

ACTIONS = {"build": build, "publish": publish, "list": show, "probe": probe}

if __name__ == "__main__":
    ACTIONS[verb(list(ACTIONS))]()
