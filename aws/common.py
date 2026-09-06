import json
import os
import subprocess
import sys
import tempfile

# PATHS

AWS_DIR = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(AWS_DIR)
DESK = os.path.dirname(REPO)
ENV_PATH = os.path.join(DESK, ".env")
SITE_DIR = os.path.join(REPO, "site")
DIST_DIR = os.path.join(SITE_DIR, "dist")

# ENV

def load_env():
    if not os.path.exists(ENV_PATH): return
    with open(ENV_PATH) as handle:
        for line in handle:
            line = line.strip()
            if not line or line.startswith("#"): continue
            key, _, value = line.partition("=")
            os.environ.setdefault(key.strip(), value.strip())

load_env()

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

# ACCOUNT

ACCOUNT = env("AWS_ACCOUNT_ID")
REGION = env("AWS_DEFAULT_REGION", "us-east-2")
EAST = "us-east-1"

# SITE

APEX = "carlomitchener.com"
BUCKET = env("CARLOMITCHENER_BUCKET", "carlomitchener")
SITE_ORIGIN = f"{BUCKET}.s3.{REGION}.amazonaws.com"
SITE_ALIASES = [APEX, f"www.{APEX}"]
ORIGIN_PATH = "/site"
ART_URL = f"https://{APEX}/art"
SITE_URL = f"https://{APEX}"
CERT_ARN = env("CARLOMITCHENER_CERT")
ZONE = env("CARLOMITCHENER_ZONE")
ROUTER_NAME = "carlomitchener-router"
HEADERS_NAME = "carlomitchener-security"
OAC_NAME = "carlomitchener"
ORIGIN_ID = "site"
CACHE_OPTIMIZED = "658327ea-f89d-4fab-a63d-7e88639e58f6"
CF_ZONE = "Z2FDTNDATAQYW2"

# LAMBDA

ROLE_NAME = env("ROLE_NAME", "carlomitchener-role")
FUNCTION_PREFIX = "carlomitchener"
AUTOMATOR_NAME = "carlomitchener-automator"

# REFUSE

NET_ZONE = env("MRLYNET_ZONE", "")

def guard_net(zone):
    if NET_ZONE and zone == NET_ZONE:
        raise SystemExit(f"refuse: {NET_ZONE} is the mrly.net zone and this console never writes it")

def guard_bucket(bucket):
    if not bucket.startswith(FUNCTION_PREFIX):
        raise SystemExit(f"refuse: {bucket} is not a carlomitchener bucket")

def guard_mrly(value):
    for key, other in os.environ.items():
        if key.startswith("MRLYNET_") and other and other == value:
            raise SystemExit(f"refuse: {value} is {key} and belongs to mrly.net")

# SHELL

def aws(*args, region=None):
    cmd = ["aws"] + [str(a) for a in args]
    if region: cmd += ["--region", region]
    cmd += ["--output", "json"]
    done = subprocess.run(cmd, capture_output=True, text=True)
    if done.returncode != 0:
        raise RuntimeError(" ".join(cmd) + "\n" + done.stderr.strip())
    text = done.stdout.strip()
    return json.loads(text) if text else None

def maybe(*args, region=None):
    try:
        return aws(*args, region=region)
    except RuntimeError:
        return None

def shell(*args, cwd=None):
    cmd = [str(a) for a in args]
    done = subprocess.run(cmd, capture_output=True, text=True, cwd=cwd)
    if done.returncode != 0:
        raise RuntimeError(" ".join(cmd) + "\n" + done.stderr.strip())
    return done.stdout

def stream(*args, cwd=None):
    done = subprocess.run([str(a) for a in args], cwd=cwd)
    if done.returncode != 0:
        raise RuntimeError(" ".join(str(a) for a in args))

def tmpfile(text, suffix):
    handle, path = tempfile.mkstemp(suffix=suffix)
    os.write(handle, text.encode())
    os.close(handle)
    return path

def blob(text, suffix, run):
    path = tmpfile(text, suffix)
    try:
        return run("fileb://" + path)
    finally:
        os.remove(path)

# SAY

def say(text=""):
    print(text)

def verdict(good, label, detail):
    say(f"{'GO' if good else 'HOLD':<4} {label:<26} {detail}")

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

# RESOLVE

def zone_id():
    if ZONE: return ZONE
    data = aws("route53", "list-hosted-zones")
    for item in data["HostedZones"]:
        if item["Name"].rstrip(".") == APEX and not item["Config"]["PrivateZone"]:
            return item["Id"].rsplit("/", 1)[-1]
    return ""

def records(zone):
    data = aws("route53", "list-resource-record-sets", "--hosted-zone-id", zone)
    return data["ResourceRecordSets"]

def certificates():
    data = aws("acm", "list-certificates", region=EAST)
    return data["CertificateSummaryList"]

def cert_arn():
    if CERT_ARN: return CERT_ARN
    for item in certificates():
        if item["DomainName"] == APEX: return item["CertificateArn"]
    return ""

def distributions():
    data = aws("cloudfront", "list-distributions")
    return ((data or {}).get("DistributionList") or {}).get("Items") or []

def site_distribution():
    for item in distributions():
        aliases = (item.get("Aliases") or {}).get("Items") or []
        if APEX in aliases: return item
    return None

def site_id():
    item = site_distribution()
    return item["Id"] if item else ""

def distribution_arn(dist):
    return f"arn:aws:cloudfront::{need('AWS_ACCOUNT_ID')}:distribution/{dist}"

def oac_id(name):
    data = aws("cloudfront", "list-origin-access-controls")
    for item in ((data or {}).get("OriginAccessControlList") or {}).get("Items") or []:
        if item["Name"] == name: return item["Id"]
    return ""

def cf_function(name):
    data = maybe("cloudfront", "describe-function", "--name", name)
    return data["FunctionSummary"] if data else None

def function_arn(name):
    found = cf_function(name)
    return found["FunctionMetadata"]["FunctionARN"] if found else ""

def headers_policy(name):
    data = aws("cloudfront", "list-response-headers-policies", "--type", "custom")
    for item in ((data or {}).get("ResponseHeadersPolicyList") or {}).get("Items") or []:
        policy = item["ResponseHeadersPolicy"]
        if policy["ResponseHeadersPolicyConfig"]["Name"] == name: return policy["Id"]
    return ""

def role_arn():
    found = maybe("iam", "get-role", "--role-name", ROLE_NAME)
    return found["Role"]["Arn"] if found else ""

def ids():
    say(f"account       {ACCOUNT or 'AWS_ACCOUNT_ID missing'}")
    say(f"region        {REGION}")
    say(f"apex          {APEX}")
    say(f"bucket        {BUCKET}")
    say(f"origin        {SITE_ORIGIN}{ORIGIN_PATH}")
    say(f"zone          {zone_id() or 'none yet'}")
    say(f"cert          {cert_arn() or 'none yet'}")
    say(f"distribution  {site_id() or 'none yet'}")
    say(f"oac           {oac_id(OAC_NAME) or 'none yet'}")
    say(f"router        {function_arn(ROUTER_NAME) or 'none yet'}")
    say(f"headers       {headers_policy(HEADERS_NAME) or 'none yet'}")
    say(f"role          {role_arn() or 'none yet'}")
