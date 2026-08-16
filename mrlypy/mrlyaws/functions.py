import boto3
import os
import shutil
import zipfile

from config import (
    BOTO3_ARN,
    NUMPY_ARN,
    PILLOW_ARN,
)
from config import ROLE_ARN
from config import (
    MRLYSHOP_AUTOMATOR_ENV_VARS,
    MRLYSHOP_STOREFRONT_ENV_VARS
)

RUNTIME = "python3.13"
ARCHITECTURE = "arm64"

LOG_FORMAT = "JSON"
APPLICATION_LOG_LEVEL = "INFO"
SYSTEM_LOG_LEVEL = "INFO"

MAXIMUM_RETRY_ATTEMPTS = 0
RESERVED_CONCURRENT_EXECUTIONS = 1

AWS_DIR = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(AWS_DIR)
LIBS_DIR = ROOT
APPS_DIR = ROOT
CLOUD_DIR = os.path.join(ROOT, "mrlycloud")

MRLYSHOP_AUTOMATOR_CONFIG = {
    "TIMEOUT": 64,
    "MEMORY_SIZE": 4096,
    "STORAGE_SIZE": 512,
    "ENV_VARS": MRLYSHOP_AUTOMATOR_ENV_VARS,
    "LIBS": ["mrlycore", "mrlytwo", "mrlytile", "mrlypaint", "mrlygen"],
    "CLOUD": True,
    "LAYERS": [
        BOTO3_ARN,
        NUMPY_ARN,
        PILLOW_ARN,
    ]
}

MRLYSHOP_STOREFRONT_CONFIG = {
    "TIMEOUT": 64,
    "MEMORY_SIZE": 1024,
    "STORAGE_SIZE": 512,
    "ENV_VARS": MRLYSHOP_STOREFRONT_ENV_VARS,
    "LIBS": ["mrlycore"],
    "CLOUD": True,
    "LAYERS": [
        BOTO3_ARN,
    ]
}

lambda_client = boto3.client("lambda")

def create_zip_file(source_path: str) -> str:
    clean_path = source_path.rstrip(os.sep)
    zip_filename = f"{clean_path}.zip"
    with zipfile.ZipFile(zip_filename, "w", zipfile.ZIP_DEFLATED) as zf:
        if os.path.isdir(clean_path):
            for root, dirs, files in os.walk(clean_path):
                dirs[:] = [d for d in dirs if d != "__pycache__"]
                for file in files:
                    if file.startswith('.') or file.endswith('.pyc'):
                        continue
                    file_path = os.path.join(root, file)
                    arcname = os.path.relpath(file_path, clean_path)
                    zf.write(file_path, arcname)
        else:
            raise ValueError(f"Source '{clean_path}' is not a directory.")
    return zip_filename

def function_exists(function_name: str) -> bool:
    try:
        lambda_client.get_function(FunctionName=function_name)
        return True
    except lambda_client.exceptions.ResourceNotFoundException:
        return False

def deploy(source_dir: str, function_suffix: str, config: dict):
    if not os.path.exists(source_dir):
        raise ValueError(f"Source '{source_dir}' not found.")
    function_name = function_suffix
    handler = "lambda.handler"
    print(f"Deploying: {function_name}")
    print(f"Source: {source_dir}")
    print(f"Layers: {len(config['LAYERS'])}")
    # COPY LIBS
    copied_dirs = []
    for lib in config.get("LIBS", []):
        lib_src = os.path.join(LIBS_DIR, lib)
        lib_dest = os.path.join(source_dir, lib)
        print(f"Copying {lib}...")
        shutil.copytree(lib_src, lib_dest, ignore=shutil.ignore_patterns("__pycache__"))
        copied_dirs.append(lib_dest)
    # COPY CLOUD
    if config.get("CLOUD", False):
        cloud_dest = os.path.join(source_dir, "mrlycloud")
        print("Copying mrlycloud...")
        shutil.copytree(CLOUD_DIR, cloud_dest, ignore=shutil.ignore_patterns("__pycache__"))
        copied_dirs.append(cloud_dest)
    zip_file = create_zip_file(source_dir)
    for d in copied_dirs:
        shutil.rmtree(d)
    with open(zip_file, "rb") as f:
        zipped_code = f.read()
    function_config = {
        "Role": ROLE_ARN,
        "Handler": handler,
        "Runtime": RUNTIME,
        "Timeout": config['TIMEOUT'],
        "MemorySize": config['MEMORY_SIZE'],
        "Layers": config['LAYERS'],
        "Environment": {
            "Variables": config['ENV_VARS']
        },
        "EphemeralStorage": {
            "Size": config['STORAGE_SIZE']
        },
        "LoggingConfig": {
            "LogFormat": LOG_FORMAT,
            "ApplicationLogLevel": APPLICATION_LOG_LEVEL,
            "SystemLogLevel": SYSTEM_LOG_LEVEL
        }
    }
    create_config = {
        **function_config,
        "Architectures": [ARCHITECTURE]
    }
    if function_exists(function_name):
        print("Updating function...")
        lambda_client.update_function_code(
            FunctionName=function_name,
            ZipFile=zipped_code,
            Publish=True
        )
        print("Waiting for update...")
        waiter = lambda_client.get_waiter("function_updated")
        waiter.wait(FunctionName=function_name)
        print("Updating configuration...")
        lambda_client.update_function_configuration(
            FunctionName=function_name,
            **function_config
        )
        lambda_client.put_function_event_invoke_config(
            FunctionName=function_name,
            MaximumRetryAttempts=MAXIMUM_RETRY_ATTEMPTS
        )
        print("Function updated!")
    else:
        print("Creating new function...")
        lambda_client.create_function(
            FunctionName=function_name,
            Code={"ZipFile": zipped_code},
            Publish=True,
            **create_config
        )
        lambda_client.put_function_event_invoke_config(
            FunctionName=function_name,
            MaximumRetryAttempts=MAXIMUM_RETRY_ATTEMPTS
        )
        print("Function created!")
    print("Setting concurrency...")
    lambda_client.put_function_concurrency(
        FunctionName=function_name,
        ReservedConcurrentExecutions=RESERVED_CONCURRENT_EXECUTIONS
    )
    print("Concurrency set!")
    print(f"Function deployed: {function_name}")

# COMMANDS

def automator():
    deploy(os.path.join(ROOT, "mrlyshop", "automator"), "mrlyshop-automator", MRLYSHOP_AUTOMATOR_CONFIG)

def storefront():
    deploy(os.path.join(ROOT, "mrlyshop", "storefront"), "mrlyshop-storefront", MRLYSHOP_STOREFRONT_CONFIG)

if __name__ == "__main__":
    pass
