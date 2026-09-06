import json
import time

from common import (
    APEX, BUCKET, CACHE_OPTIMIZED, EAST, HEADERS_NAME, OAC_NAME, ORIGIN_ID, ORIGIN_PATH,
    ROUTER_NAME, SITE_ALIASES, SITE_ORIGIN, CF_ZONE,
    aws, blob, cert_arn, cf_function, distribution_arn, function_arn, gate, guard_bucket,
    guard_mrly, guard_net, headers_policy, ids, maybe, oac_id, records, save_env, say,
    site_distribution, site_id, verb, verdict, zone_id,
)

# CODE

ROUTER_CODE = """function handler(event) {
    var request = event.request;
    var uri = request.uri;
    var host = request.headers.host ? request.headers.host.value : '';
    if (host === 'www.carlomitchener.com') {
        return redirect('https://carlomitchener.com' + uri);
    }
    if (uri.charAt(uri.length - 1) === '/') {
        request.uri = uri + 'index.html';
        return request;
    }
    var last = uri.substring(uri.lastIndexOf('/') + 1);
    if (last.indexOf('.') === -1) {
        return redirect(uri + '/');
    }
    return request;
}

function redirect(location) {
    return {
        statusCode: 301,
        statusDescription: 'Moved Permanently',
        headers: { 'location': { value: location } }
    };
}
"""

CSP = "; ".join([
    "default-src 'self'",
    "script-src 'self' 'wasm-unsafe-eval'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https://cdn.shopify.com",
    "font-src 'self' data:",
    "connect-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "frame-ancestors 'none'",
])

# CHECK

def check_cert():
    arn = cert_arn()
    if not arn:
        verdict(False, "cert", "not found in us-east-1, run cert")
        return
    data = maybe("acm", "describe-certificate", "--certificate-arn", arn, region=EAST)
    if not data:
        verdict(False, "cert", "arn does not resolve in us-east-1")
        return
    cert = data["Certificate"]
    names = set(cert["SubjectAlternativeNames"])
    verdict(cert["Status"] == "ISSUED", "cert status", cert["Status"])
    verdict(set(SITE_ALIASES) <= names, "cert names", ", ".join(sorted(names)))
    for option in cert["DomainValidationOptions"]:
        good = option["ValidationStatus"] == "SUCCESS"
        verdict(good, f"cert {option['DomainName']}", option["ValidationStatus"])

def check_zone():
    zone = zone_id()
    if not zone:
        verdict(False, "zone", f"no public zone for {APEX}, run zone")
        return
    verdict(True, "zone", zone)
    zone_ns = set()
    for record in records(zone):
        if record["Type"] == "NS" and record["Name"] == APEX + ".":
            zone_ns = {v["Value"].rstrip(".").lower() for v in record["ResourceRecords"]}
    data = maybe("route53domains", "get-domain-detail", "--domain-name", APEX, region=EAST)
    if not data:
        verdict(False, f"ns {APEX}", "registrar detail unavailable")
        return
    registrar = {n["Name"].rstrip(".").lower() for n in data["Nameservers"]}
    same = bool(zone_ns) and zone_ns == registrar
    verdict(same, f"ns {APEX}", "zone matches registrar" if same else "drift")

def check_bucket():
    data = maybe("s3api", "get-public-access-block", "--bucket", BUCKET)
    block = (data or {}).get("PublicAccessBlockConfiguration") or {}
    flags = ["BlockPublicAcls", "IgnorePublicAcls", "BlockPublicPolicy", "RestrictPublicBuckets"]
    shut = all(block.get(flag) for flag in flags)
    verdict(shut, "bucket public access", "all four blocked" if shut else "open flags")
    site = maybe("s3api", "get-bucket-website", "--bucket", BUCKET)
    verdict(site is None, "bucket website", "none" if site is None else "website config present")
    policy = maybe("s3api", "get-bucket-policy", "--bucket", BUCKET)
    dist = site_id()
    if not policy:
        verdict(False, "bucket policy", "absent, run bucket after distribution")
        return
    text = policy["Policy"]
    good = "cloudfront.amazonaws.com" in text and bool(dist) and distribution_arn(dist) in text
    detail = "grants cloudfront s3:GetObject" if good else "does not match the distribution"
    verdict(good, "bucket policy", detail)

def check_pieces():
    router = function_arn(ROUTER_NAME)
    verdict(bool(router), "router function", router or "absent")
    policy = headers_policy(HEADERS_NAME)
    verdict(bool(policy), "headers policy", policy or "absent")
    oac = oac_id(OAC_NAME)
    verdict(bool(oac), "origin access control", oac or "absent")

def check_distribution():
    item = site_distribution()
    if not item:
        verdict(False, "distribution", f"no distribution carries {APEX}")
        return
    aliases = (item.get("Aliases") or {}).get("Items") or []
    state = f"{item['Id']} {item['Status']} {item['DomainName']}"
    verdict(item["Enabled"], "distribution state", state)
    verdict(set(aliases) == set(SITE_ALIASES), "distribution aliases", ", ".join(sorted(aliases)))

def check_wiring():
    item = site_distribution()
    if not item: return
    data = aws("cloudfront", "get-distribution-config", "--id", item["Id"])
    config = data["DistributionConfig"]
    behavior = config["DefaultCacheBehavior"]
    linked = (behavior.get("FunctionAssociations") or {}).get("Items") or []
    names = [f["FunctionARN"].rsplit("/", 1)[-1] for f in linked]
    verdict(names == [ROUTER_NAME], "router wired", ", ".join(names) or "none")
    policy = behavior.get("ResponseHeadersPolicyId")
    verdict(policy == headers_policy(HEADERS_NAME), "headers wired", policy or "none")
    origin = config["Origins"]["Items"][0]
    verdict(origin["DomainName"] == SITE_ORIGIN, "origin", origin["DomainName"])
    verdict(origin["OriginPath"] == ORIGIN_PATH, "origin path", origin["OriginPath"] or "none")
    errors = (config.get("CustomErrorResponses") or {}).get("Items") or []
    pages = {(e["ErrorCode"], e["ResponsePagePath"], e["ResponseCode"]) for e in errors}
    want = {(403, "/404.html", "404"), (404, "/404.html", "404")}
    verdict(pages == want, "error pages", f"{len(errors)} rules")
    cert = (config.get("ViewerCertificate") or {}).get("ACMCertificateArn")
    verdict(cert == cert_arn(), "cert wired", cert or "none")

def check_dns():
    zone = zone_id()
    if not zone: return
    item = site_distribution()
    target = (item["DomainName"] + ".").lower() if item else ""
    found = {}
    for record in records(zone):
        alias = record.get("AliasTarget")
        if not alias: continue
        found[(record["Name"].lower(), record["Type"])] = alias["DNSName"].lower()
    for name in [APEX + ".", f"www.{APEX}."]:
        for kind in ["A", "AAAA"]:
            have = found.get((name, kind))
            good = bool(target) and have == target
            verdict(good, f"dns {kind} {name}", have or "absent")

def check():
    ids()
    say()
    check_zone()
    check_cert()
    check_bucket()
    check_pieces()
    check_distribution()
    check_wiring()
    check_dns()

# ZONE

def zone():
    found = zone_id()
    if found:
        if not gate("zone", [
            f"zone {found} already carries {APEX}, create nothing",
            "save CARLOMITCHENER_ZONE",
        ]): return
        save_env("CARLOMITCHENER_ZONE", found)
        return
    if not gate("zone", [
        f"create the public hosted zone for {APEX}",
        "then point the registrar at its four nameservers",
        "save CARLOMITCHENER_ZONE",
    ]): return
    made = aws("route53", "create-hosted-zone", "--name", APEX,
               "--caller-reference", f"carlomitchener-{int(time.time())}")
    new = made["HostedZone"]["Id"].rsplit("/", 1)[-1]
    say(f"zone {new} created")
    for server in made["DelegationSet"]["NameServers"]:
        say(f"  ns {server}")
    save_env("CARLOMITCHENER_ZONE", new)

# CERT

def validation_records(arn):
    for _ in range(30):
        data = aws("acm", "describe-certificate", "--certificate-arn", arn, region=EAST)
        options = data["Certificate"].get("DomainValidationOptions") or []
        if options and all("ResourceRecord" in option for option in options):
            return options
        time.sleep(5)
    raise SystemExit("refuse: acm never published the validation records")

def upsert(zone, changes):
    guard_net(zone)
    batch = {"Comment": "carlomitchener", "Changes": changes}
    aws("route53", "change-resource-record-sets", "--hosted-zone-id", zone,
        "--change-batch", json.dumps(batch))

def cert():
    found = cert_arn()
    zone = zone_id()
    if not zone:
        raise SystemExit("refuse: run zone first")
    if not gate("cert", [
        f"{'reuse' if found else 'request'} an acm certificate in {EAST}",
        f"names {', '.join(SITE_ALIASES)}, DNS validation",
        "write the validation CNAMEs into the zone",
        "wait for ISSUED",
        "save CARLOMITCHENER_CERT",
    ]): return
    if not found:
        made = aws("acm", "request-certificate", "--domain-name", APEX,
                   "--subject-alternative-names", f"www.{APEX}",
                   "--validation-method", "DNS",
                   "--key-algorithm", "RSA_2048", region=EAST)
        found = made["CertificateArn"]
        say(f"cert requested {found}")
    options = validation_records(found)
    changes = []
    seen = set()
    for option in options:
        record = option["ResourceRecord"]
        if record["Name"] in seen: continue
        seen.add(record["Name"])
        changes.append({"Action": "UPSERT", "ResourceRecordSet": {
            "Name": record["Name"], "Type": record["Type"], "TTL": 300,
            "ResourceRecords": [{"Value": record["Value"]}],
        }})
    upsert(zone, changes)
    say(f"{len(changes)} validation records written")
    for _ in range(60):
        data = aws("acm", "describe-certificate", "--certificate-arn", found, region=EAST)
        status = data["Certificate"]["Status"]
        if status == "ISSUED":
            say("cert ISSUED")
            save_env("CARLOMITCHENER_CERT", found)
            return
        if status not in ["PENDING_VALIDATION"]:
            raise SystemExit(f"refuse: certificate is {status}")
        say(f"cert {status}, waiting")
        time.sleep(20)
    raise SystemExit("cert still pending, rerun cert --yes")

# BUCKET

def bucket():
    guard_bucket(BUCKET)
    guard_mrly(BUCKET)
    dist = site_id()
    steps = [
        f"block all public access on {BUCKET}",
        f"suspend versioning on {BUCKET} if enabled",
        f"delete any website config on {BUCKET}",
    ]
    if dist:
        steps.append(f"policy: s3:GetObject to cloudfront for {distribution_arn(dist)}")
    else:
        steps.append("policy: SKIPPED, no distribution yet, rerun bucket after it")
    if not gate("bucket", steps): return
    aws("s3api", "put-public-access-block", "--bucket", BUCKET,
        "--public-access-block-configuration",
        "BlockPublicAcls=true,IgnorePublicAcls=true,"
        "BlockPublicPolicy=true,RestrictPublicBuckets=true")
    state = maybe("s3api", "get-bucket-versioning", "--bucket", BUCKET) or {}
    if state.get("Status") == "Enabled":
        aws("s3api", "put-bucket-versioning", "--bucket", BUCKET,
            "--versioning-configuration", "Status=Suspended")
    maybe("s3api", "delete-bucket-website", "--bucket", BUCKET)
    if not dist:
        say("bucket ready, policy pending the distribution")
        return
    policy = {
        "Version": "2012-10-17",
        "Statement": [{
            "Sid": "AllowCloudFrontServicePrincipal",
            "Effect": "Allow",
            "Principal": {"Service": "cloudfront.amazonaws.com"},
            "Action": "s3:GetObject",
            "Resource": f"arn:aws:s3:::{BUCKET}/*",
            "Condition": {"StringEquals": {"AWS:SourceArn": distribution_arn(dist)}},
        }],
    }
    aws("s3api", "put-bucket-policy", "--bucket", BUCKET, "--policy", json.dumps(policy))
    say(f"bucket {BUCKET} sealed to {dist}")

# FUNCTION

def put_function(name, code, comment):
    data = maybe("cloudfront", "describe-function", "--name", name)
    config = json.dumps({"Comment": comment, "Runtime": "cloudfront-js-2.0"})
    if data:
        tag = data["ETag"]
        updated = blob(code, ".js", lambda ref: aws(
            "cloudfront", "update-function", "--name", name, "--if-match", tag,
            "--function-config", config, "--function-code", ref))
        tag = updated["ETag"]
    else:
        created = blob(code, ".js", lambda ref: aws(
            "cloudfront", "create-function", "--name", name,
            "--function-config", config, "--function-code", ref))
        tag = created["ETag"]
    published = aws("cloudfront", "publish-function", "--name", name, "--if-match", tag)
    arn = published["FunctionSummary"]["FunctionMetadata"]["FunctionARN"]
    say(f"{name} live {arn}")
    return arn

def function():
    exists = cf_function(ROUTER_NAME)
    if not gate("function", [
        f"{'update' if exists else 'create'} cloudfront function {ROUTER_NAME}",
        "runtime cloudfront-js-2.0 on viewer-request",
        f"www.{APEX} 301s to https://{APEX}",
        "trailing slash appends index.html, extensionless path 301s to a slash",
        "publish the new version",
    ]): return
    put_function(ROUTER_NAME, ROUTER_CODE, f"{APEX} router")

# HEADERS

def headers():
    config = {
        "Name": HEADERS_NAME,
        "Comment": f"{APEX} security headers",
        "SecurityHeadersConfig": {
            "StrictTransportSecurity": {
                "Override": True,
                "IncludeSubdomains": True,
                "Preload": False,
                "AccessControlMaxAgeSec": 31536000,
            },
            "ContentTypeOptions": {"Override": True},
            "ReferrerPolicy": {
                "Override": True,
                "ReferrerPolicy": "strict-origin-when-cross-origin",
            },
            "ContentSecurityPolicy": {"Override": True, "ContentSecurityPolicy": CSP},
        },
    }
    found = headers_policy(HEADERS_NAME)
    if not gate("headers", [
        f"{'update' if found else 'create'} response headers policy {HEADERS_NAME}",
        "hsts one year, includeSubdomains, no preload",
        "nosniff, referrer strict-origin-when-cross-origin",
        f"csp {CSP}",
    ]): return
    if found:
        current = aws("cloudfront", "get-response-headers-policy", "--id", found)
        aws("cloudfront", "update-response-headers-policy", "--id", found,
            "--if-match", current["ETag"], "--response-headers-policy-config", json.dumps(config))
    else:
        made = aws("cloudfront", "create-response-headers-policy",
                   "--response-headers-policy-config", json.dumps(config))
        found = made["ResponseHeadersPolicy"]["Id"]
    say(f"{HEADERS_NAME} {found}")

# DISTRIBUTION

def desired(oac, router, policy, cert, caller):
    return {
        "CallerReference": caller,
        "Comment": "carlomitchener",
        "Enabled": True,
        "Staging": False,
        "DefaultRootObject": "index.html",
        "PriceClass": "PriceClass_All",
        "HttpVersion": "http2and3",
        "IsIPV6Enabled": True,
        "WebACLId": "",
        "Aliases": {"Quantity": len(SITE_ALIASES), "Items": list(SITE_ALIASES)},
        "Origins": {"Quantity": 1, "Items": [{
            "Id": ORIGIN_ID,
            "DomainName": SITE_ORIGIN,
            "OriginPath": ORIGIN_PATH,
            "CustomHeaders": {"Quantity": 0},
            "S3OriginConfig": {"OriginAccessIdentity": ""},
            "OriginAccessControlId": oac,
            "ConnectionAttempts": 3,
            "ConnectionTimeout": 10,
        }]},
        "OriginGroups": {"Quantity": 0},
        "CacheBehaviors": {"Quantity": 0},
        "DefaultCacheBehavior": {
            "TargetOriginId": ORIGIN_ID,
            "ViewerProtocolPolicy": "redirect-to-https",
            "AllowedMethods": {
                "Quantity": 2,
                "Items": ["GET", "HEAD"],
                "CachedMethods": {"Quantity": 2, "Items": ["GET", "HEAD"]},
            },
            "Compress": True,
            "SmoothStreaming": False,
            "FieldLevelEncryptionId": "",
            "CachePolicyId": CACHE_OPTIMIZED,
            "ResponseHeadersPolicyId": policy,
            "TrustedSigners": {"Enabled": False, "Quantity": 0},
            "TrustedKeyGroups": {"Enabled": False, "Quantity": 0},
            "LambdaFunctionAssociations": {"Quantity": 0},
            "FunctionAssociations": {"Quantity": 1, "Items": [
                {"FunctionARN": router, "EventType": "viewer-request"},
            ]},
        },
        "CustomErrorResponses": {"Quantity": 2, "Items": [
            {"ErrorCode": code, "ResponsePagePath": "/404.html",
             "ResponseCode": "404", "ErrorCachingMinTTL": 60}
            for code in [403, 404]
        ]},
        "ViewerCertificate": {
            "ACMCertificateArn": cert,
            "SSLSupportMethod": "sni-only",
            "MinimumProtocolVersion": "TLSv1.2_2021",
            "CloudFrontDefaultCertificate": False,
        },
        "Restrictions": {"GeoRestriction": {"RestrictionType": "none", "Quantity": 0}},
        "Logging": {"Enabled": False, "IncludeCookies": False, "Bucket": "", "Prefix": ""},
    }

def ensure_oac():
    found = oac_id(OAC_NAME)
    if found: return found
    config = {
        "Name": OAC_NAME,
        "Description": f"{APEX} site origin",
        "SigningProtocol": "sigv4",
        "SigningBehavior": "always",
        "OriginAccessControlOriginType": "s3",
    }
    made = aws("cloudfront", "create-origin-access-control",
               "--origin-access-control-config", json.dumps(config))
    return made["OriginAccessControl"]["Id"]

def distribution():
    router = function_arn(ROUTER_NAME)
    policy = headers_policy(HEADERS_NAME)
    cert = cert_arn()
    item = site_distribution()
    if not gate("distribution", [
        f"{'update' if item else 'create'} the {APEX} distribution",
        f"origin {SITE_ORIGIN}{ORIGIN_PATH} through oac {OAC_NAME}",
        f"aliases {', '.join(SITE_ALIASES)}",
        f"cert {cert or 'MISSING, run cert first'} TLSv1.2_2021 sni-only",
        f"router {router or 'MISSING, run function first'}",
        f"headers {policy or 'MISSING, run headers first'}",
        "403 and 404 to /404.html with code 404 and ttl 60",
    ]): return
    if not router or not policy or not cert:
        raise SystemExit("refuse: run cert, function and headers first")
    oac = ensure_oac()
    if item:
        current = aws("cloudfront", "get-distribution-config", "--id", item["Id"])
        config = desired(oac, router, policy, cert, current["DistributionConfig"]["CallerReference"])
        aws("cloudfront", "update-distribution", "--id", item["Id"],
            "--if-match", current["ETag"], "--distribution-config", json.dumps(config))
        made = item
        say(f"distribution {item['Id']} {item['DomainName']} updated")
    else:
        config = desired(oac, router, policy, cert, f"carlomitchener-{int(time.time())}")
        data = aws("cloudfront", "create-distribution", "--distribution-config", json.dumps(config))
        made = data["Distribution"]
        say(f"distribution {made['Id']} {made['DomainName']} created")
    save_env("CARLOMITCHENER_OAC", oac)
    save_env("CARLOMITCHENER_ID", made["Id"])

# RECORDS

def records_verb():
    zone = zone_id()
    item = site_distribution()
    if not zone:
        raise SystemExit("refuse: run zone first")
    if not item:
        raise SystemExit("refuse: run distribution first")
    target = item["DomainName"]
    names = [APEX, f"www.{APEX}"]
    if not gate("records", [
        f"zone {zone}",
        f"A and AAAA alias for {', '.join(names)} to {target}",
        "alias target zone " + CF_ZONE + ", no health check",
    ]): return
    changes = []
    for name in names:
        for kind in ["A", "AAAA"]:
            changes.append({"Action": "UPSERT", "ResourceRecordSet": {
                "Name": name, "Type": kind,
                "AliasTarget": {
                    "HostedZoneId": CF_ZONE,
                    "DNSName": target,
                    "EvaluateTargetHealth": False,
                },
            }})
    upsert(zone, changes)
    say(f"{len(changes)} alias records point at {target}")

# MAIN

VERBS = {
    "check": check,
    "zone": zone,
    "cert": cert,
    "bucket": bucket,
    "function": function,
    "headers": headers,
    "distribution": distribution,
    "records": records_verb,
}

if __name__ == "__main__":
    VERBS[verb(list(VERBS))]()
