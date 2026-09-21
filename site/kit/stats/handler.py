import boto3
import json
import os
import re
import time
from datetime import datetime, timedelta, timezone

BUCKET = os.environ["STATS_BUCKET"]
DISTRIBUTION = os.environ.get("STATS_DISTRIBUTION", "")
FUNCTIONS = [one.strip() for one in os.environ["STATS_FUNCTIONS"].split(",") if one.strip()]
STATS_KEY = os.environ["STATS_KEY"]
HOURS = 24
ERROR_LINES = 10
ERROR_PATTERN = '?ERROR ?"Task timed out" ?Traceback ?"Runtime exited"'
CLIP = 160
URL = re.compile(r"https?://\S+")
QUERY = re.compile(r"\?[^\s]*=[^\s]*")
SECRET = re.compile(r"(?i)(bearer\s+\S+|[\w.-]*(?:key|token|secret|password|auth|signature|credential)[\w.-]*\s*[=:]\s*(?:bearer\s+)?\S+)")

cloudwatch = boto3.client("cloudwatch")
cloudwatch_global = boto3.client("cloudwatch", region_name="us-east-1")
logs = boto3.client("logs")
s3 = boto3.client("s3")

# LISTS

def rows(name: str) -> list[tuple[str, str, str]]:
    out = []
    for one in os.environ.get(name, "").split(","):
        label, _, rest = one.strip().partition("=")
        prefix, _, pattern = rest.partition("=")
        if label.strip(): out.append((label.strip(), prefix.strip(), pattern.strip()))
    return out

SIZES = rows("STATS_SIZES")
COUNTS = rows("STATS_COUNTS")
FOLDERS = rows("STATS_FOLDERS")

# METRICS

def window() -> tuple[datetime, datetime]:
    end = datetime.now(timezone.utc).replace(second=0, microsecond=0)
    return end - timedelta(hours=HOURS), end

def series(client, namespace: str, name: str, dimensions: list[dict], stat: str, period: int) -> list[tuple[int, float]]:
    start, end = window()
    query = {
        "Id": "q",
        "MetricStat": {"Metric": {"Namespace": namespace, "MetricName": name, "Dimensions": dimensions}, "Period": period, "Stat": stat},
        "ReturnData": True,
    }
    result = client.get_metric_data(MetricDataQueries=[query], StartTime=start, EndTime=end, ScanBy="TimestampAscending")["MetricDataResults"][0]
    return [(int(stamp.timestamp()), round(value, 3)) for stamp, value in zip(result["Timestamps"], result["Values"])]

def total(points: list[tuple[int, float]]) -> float:
    return round(sum(value for _, value in points), 3)

def mean(points: list[tuple[int, float]]) -> float:
    return round(sum(value for _, value in points) / len(points), 3) if points else 0

def cloudfront() -> dict:
    if not DISTRIBUTION:
        return {}
    dimensions = [{"Name": "DistributionId", "Value": DISTRIBUTION}, {"Name": "Region", "Value": "Global"}]
    requests = series(cloudwatch_global, "AWS/CloudFront", "Requests", dimensions, "Sum", 3600)
    bytes_out = series(cloudwatch_global, "AWS/CloudFront", "BytesDownloaded", dimensions, "Sum", 3600)
    errors_4xx = series(cloudwatch_global, "AWS/CloudFront", "4xxErrorRate", dimensions, "Average", 3600)
    errors_5xx = series(cloudwatch_global, "AWS/CloudFront", "5xxErrorRate", dimensions, "Average", 3600)
    return {
        "requests": total(requests),
        "bytes": total(bytes_out),
        "error_4xx": mean(errors_4xx),
        "error_5xx": mean(errors_5xx),
        "hourly": [{"at": stamp, "requests": value} for stamp, value in requests],
    }

def lambdas() -> dict:
    out = {}
    for name in FUNCTIONS:
        dimensions = [{"Name": "FunctionName", "Value": name}]
        invocations = series(cloudwatch, "AWS/Lambda", "Invocations", dimensions, "Sum", 3600)
        errors = series(cloudwatch, "AWS/Lambda", "Errors", dimensions, "Sum", 3600)
        throttles = series(cloudwatch, "AWS/Lambda", "Throttles", dimensions, "Sum", 3600)
        duration = series(cloudwatch, "AWS/Lambda", "Duration", dimensions, "Average", 3600)
        out[name] = {
            "invocations": total(invocations),
            "errors": total(errors),
            "throttles": total(throttles),
            "duration_ms": mean(duration),
            "hourly": [{"at": stamp, "invocations": value} for stamp, value in invocations],
        }
    return out

# LOGS

def clean(message: str) -> str:
    text = URL.sub("<url>", str(message))
    text = SECRET.sub("<hidden>", QUERY.sub("", text))
    return " ".join(text.split())[:CLIP]

def parse(message: str) -> dict:
    try:
        record = json.loads(message)
    except ValueError:
        return {"at": None, "level": "", "message": clean(message)}
    if "message" in record:
        return {"at": record.get("timestamp"), "level": record.get("level", ""), "message": clean(record["message"])}
    return {"at": record.get("time"), "level": record.get("type", ""), "message": clean(json.dumps(record.get("record", record)))}

def recent_errors() -> dict:
    start, end = window()
    out = {}
    for name in FUNCTIONS:
        group = f"/aws/lambda/{name}"
        try:
            events = logs.filter_log_events(logGroupName=group, startTime=int(start.timestamp() * 1000), endTime=int(end.timestamp() * 1000), filterPattern=ERROR_PATTERN, limit=100)["events"]
        except logs.exceptions.ResourceNotFoundException:
            events = []
        out[name] = [parse(event["message"]) for event in events[-ERROR_LINES:]]
    return out

# BUCKET

def count_prefixes(prefix: str, pattern: re.Pattern = None) -> int:
    count = 0
    paginator = s3.get_paginator("list_objects_v2")
    for page in paginator.paginate(Bucket=BUCKET, Prefix=prefix, Delimiter="/"):
        for one in page.get("CommonPrefixes", []):
            tail = one["Prefix"][len(prefix):]
            if pattern is None or pattern.match(tail):
                count += 1
    return count

def count_objects(prefix: str) -> tuple[int, int]:
    objects = 0
    size = 0
    paginator = s3.get_paginator("list_objects_v2")
    for page in paginator.paginate(Bucket=BUCKET, Prefix=prefix):
        for obj in page.get("Contents", []):
            objects += 1
            size += obj["Size"]
    return objects, size

def bucket() -> dict:
    out = {}
    for label, prefix, _ in SIZES:
        objects, size = count_objects(prefix)
        out[f"{label}_objects"] = objects
        out[f"{label}_bytes"] = size
    for label, prefix, _ in COUNTS:
        out[label] = count_objects(prefix)[0]
    for label, prefix, pattern in FOLDERS:
        out[label] = count_prefixes(prefix, re.compile(pattern) if pattern else None)
    return out

# RUN

def build() -> dict:
    started = time.time()
    data = {
        "at": int(started),
        "hours": HOURS,
        "cdn": cloudfront(),
        "lambdas": lambdas(),
        "errors": recent_errors(),
        "bucket": bucket(),
    }
    data["seconds"] = round(time.time() - started, 1)
    return data

def handler(event, context):
    data = build()
    s3.put_object(Bucket=BUCKET, Key=STATS_KEY, Body=json.dumps(data), ContentType="application/json", CacheControl="no-cache")
    summary = {name: (one["invocations"], one["errors"]) for name, one in data["lambdas"].items()}
    print(f"stats written in {data['seconds']} s: cdn {data['cdn'].get('requests')} requests, lambdas {summary}, bucket {data['bucket']}")
    return {"seconds": data["seconds"], "keys": len(data["bucket"])}

if __name__ == "__main__":
    print(json.dumps(build(), indent=2))
