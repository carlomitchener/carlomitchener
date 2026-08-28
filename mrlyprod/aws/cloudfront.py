import os

import boto3

from utils.boto import invalidate_cloudfront
from utils.helpers import load_env

load_env()

cf = boto3.client("cloudfront")

# DISTRIBUTIONS

MRLYNET_ID = os.environ["MRLYNET_ID"]
MRLYCDN_ID = os.environ["MRLYCDN_ID"]

# CORS

CORS_FUNCTION = "cors-mrlycdn"

CORS_FUNCTION_CODE = """\
var ALLOWED_ORIGINS = [{origins}];
function handler(event) {{
    var response = event.response;
    var headers = response.headers;
    var origin = event.request.headers.origin ? event.request.headers.origin.value : '';
    if (ALLOWED_ORIGINS.indexOf(origin) >= 0) {{
        headers['access-control-allow-origin'] = {{ value: origin }};
        headers['access-control-allow-methods'] = {{ value: 'GET, HEAD' }};
        headers['access-control-allow-headers'] = {{ value: '*' }};
    }}
    return response;
}}
"""

def _build_code(allowed_origins):
    origins = ", ".join(f"'{o}'" for o in allowed_origins)
    return CORS_FUNCTION_CODE.format(origins=origins)

# COMMANDS

def create_cors(allowed_origins=None):
    allowed_origins = allowed_origins or ["https://mrly.net"]
    code = _build_code(allowed_origins)
    print(f"Creating function: {CORS_FUNCTION}")
    func = cf.create_function(
        Name=CORS_FUNCTION,
        FunctionConfig={"Comment": f"CORS for {', '.join(allowed_origins)}", "Runtime": "cloudfront-js-2.0"},
        FunctionCode=code.encode("utf-8"),
    )
    func_etag = func["ETag"]
    func_arn = func["FunctionSummary"]["FunctionMetadata"]["FunctionARN"]
    cf.publish_function(Name=CORS_FUNCTION, IfMatch=func_etag)
    print(f"Published: {func_arn}")
    # ATTACH TO DISTRIBUTION
    dist = cf.get_distribution_config(Id=MRLYCDN_ID)
    config = dist["DistributionConfig"]
    dist_etag = dist["ETag"]
    assoc = config["DefaultCacheBehavior"].get("FunctionAssociations", {"Quantity": 0, "Items": []})
    items = [i for i in assoc.get("Items", []) if i["EventType"] != "viewer-response"]
    items.append({"FunctionARN": func_arn, "EventType": "viewer-response"})
    config["DefaultCacheBehavior"]["FunctionAssociations"] = {"Quantity": len(items), "Items": items}
    cf.update_distribution(Id=MRLYCDN_ID, DistributionConfig=config, IfMatch=dist_etag)
    print(f"Attached to distribution: {MRLYCDN_ID}")
    invalidate_cloudfront(MRLYCDN_ID)
    print("Done")

def update_cors(allowed_origins=None):
    allowed_origins = allowed_origins or ["https://mrly.net"]
    code = _build_code(allowed_origins)
    print(f"Updating function: {CORS_FUNCTION}")
    func = cf.get_function(Name=CORS_FUNCTION)
    func_etag = func["ETag"]
    resp = cf.update_function(
        Name=CORS_FUNCTION,
        FunctionConfig={"Comment": f"CORS for {', '.join(allowed_origins)}", "Runtime": "cloudfront-js-2.0"},
        FunctionCode=code.encode("utf-8"),
        IfMatch=func_etag,
    )
    cf.publish_function(Name=CORS_FUNCTION, IfMatch=resp["ETag"])
    print("Published")
    invalidate_cloudfront(MRLYCDN_ID)
    print("Done")

def delete_cors():
    print(f"Detaching function from distribution: {MRLYCDN_ID}")
    dist = cf.get_distribution_config(Id=MRLYCDN_ID)
    config = dist["DistributionConfig"]
    dist_etag = dist["ETag"]
    assoc = config["DefaultCacheBehavior"].get("FunctionAssociations", {"Quantity": 0, "Items": []})
    items = [i for i in assoc.get("Items", []) if i["EventType"] != "viewer-response"]
    config["DefaultCacheBehavior"]["FunctionAssociations"] = {"Quantity": len(items), "Items": items}
    cf.update_distribution(Id=MRLYCDN_ID, DistributionConfig=config, IfMatch=dist_etag)
    print("Detached")
    func = cf.describe_function(Name=CORS_FUNCTION)
    cf.delete_function(Name=CORS_FUNCTION, IfMatch=func["ETag"])
    print(f"Deleted function: {CORS_FUNCTION}")
    invalidate_cloudfront(MRLYCDN_ID)
    print("Done")

def check():
    print(f"Distribution: {MRLYCDN_ID}")
    dist = cf.get_distribution_config(Id=MRLYCDN_ID)
    behavior = dist["DistributionConfig"]["DefaultCacheBehavior"]
    assoc = behavior.get("FunctionAssociations", {})
    items = assoc.get("Items", [])
    if items:
        for item in items:
            print(f"  {item['EventType']}: {item['FunctionARN']}")
    else:
        print("  No functions attached")
    try:
        func = cf.describe_function(Name=CORS_FUNCTION)
        status = func["FunctionSummary"]["Status"]
        print(f"Function: {CORS_FUNCTION} ({status})")
    except cf.exceptions.NoSuchFunctionExists:
        print(f"Function: {CORS_FUNCTION} (not found)")

if __name__ == "__main__":
    pass
