import json
import subprocess

PYTHON_TESTS = {
    "boto3": "boto3",
    "hfhub": "huggingface_hub",
    "numpy": "numpy",
    "pillow": "PIL",
    "requests": "requests",
}

def handler(event, context):
    results = {}
    for name, module_name in PYTHON_TESTS.items():
        try:
            module = __import__(module_name)
            results[name] = getattr(module, "__version__", "OK")
        except ImportError as e:
            results[name] = f"ERROR: {e}"
    try:
        output = subprocess.check_output(["ffmpeg", "-version"], stderr=subprocess.STDOUT)
        results["ffmpeg"] = output.decode("utf-8").split("\n")[0]
    except Exception as e:
        results["ffmpeg"] = f"ERROR: {e}"
    return {"statusCode": 200, "body": json.dumps(results)}
