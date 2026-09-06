import json

from common import (
    BUCKET, FUNCTION_PREFIX, ROLE_NAME, aws, gate, guard_bucket, ids, maybe, need,
    role_arn, save_env, say, verb, verdict,
)

# DESIRED

POLICY_NAME = "carlomitchener-policy"
BASIC_EXECUTION = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
TRUSTED = ["lambda.amazonaws.com", "scheduler.amazonaws.com"]

TRUST_POLICY = {
    "Version": "2012-10-17",
    "Statement": [{
        "Effect": "Allow",
        "Principal": {"Service": TRUSTED},
        "Action": "sts:AssumeRole",
    }],
}

def execution_policy(account):
    return {
        "Version": "2012-10-17",
        "Statement": [
            {
                "Effect": "Allow",
                "Action": ["logs:CreateLogGroup", "logs:CreateLogStream", "logs:PutLogEvents"],
                "Resource": "arn:aws:logs:*:*:*",
            },
            {
                "Effect": "Allow",
                "Action": ["s3:GetObject", "s3:PutObject", "s3:DeleteObject", "s3:ListBucket"],
                "Resource": [f"arn:aws:s3:::{BUCKET}", f"arn:aws:s3:::{BUCKET}/*"],
            },
            {
                "Effect": "Allow",
                "Action": "lambda:InvokeFunction",
                "Resource": f"arn:aws:lambda:*:{account}:function:{FUNCTION_PREFIX}-*",
            },
        ],
    }

# CHECK

def trusted_services(role):
    services = []
    for statement in role["AssumeRolePolicyDocument"].get("Statement", []):
        service = statement.get("Principal", {}).get("Service", [])
        services += [service] if isinstance(service, str) else list(service)
    return services

def check():
    ids()
    say()
    caller = maybe("sts", "get-caller-identity")
    verdict(bool(caller), "caller", (caller or {}).get("Arn", "no credentials"))
    found = maybe("iam", "get-role", "--role-name", ROLE_NAME)
    if not found:
        verdict(False, "role", f"{ROLE_NAME} absent, run role")
        return
    role = found["Role"]
    services = trusted_services(role)
    verdict(set(TRUSTED) <= set(services), "role trust", ", ".join(services) or "nothing")
    inline = aws("iam", "list-role-policies", "--role-name", ROLE_NAME)["PolicyNames"]
    verdict(POLICY_NAME in inline, "role inline policy", ", ".join(inline) or "none")
    attached = aws("iam", "list-attached-role-policies", "--role-name", ROLE_NAME)
    arns = [item["PolicyArn"] for item in attached["AttachedPolicies"]]
    verdict(BASIC_EXECUTION in arns, "role basic execution", ", ".join(arns) or "none")
    if POLICY_NAME not in inline: return
    live = aws("iam", "get-role-policy", "--role-name", ROLE_NAME, "--policy-name", POLICY_NAME)
    text = json.dumps(live["PolicyDocument"])
    verdict(BUCKET in text, "role bucket", BUCKET if BUCKET in text else "not granted")
    invoke = f"function:{FUNCTION_PREFIX}-*"
    verdict(invoke in text, "role invoke", invoke if invoke in text else "not granted")

# ROLE

def role():
    account = need("AWS_ACCOUNT_ID")
    guard_bucket(BUCKET)
    found = role_arn()
    if not gate("role", [
        f"{'update' if found else 'create'} role {ROLE_NAME}",
        f"trust {', '.join(TRUSTED)}",
        f"inline {POLICY_NAME}: logs, s3 on {BUCKET}, lambda:InvokeFunction on {FUNCTION_PREFIX}-*",
        "attach AWSLambdaBasicExecutionRole",
        "save ROLE_ARN",
    ]): return
    if not found:
        made = aws("iam", "create-role", "--role-name", ROLE_NAME,
                   "--assume-role-policy-document", json.dumps(TRUST_POLICY))
        found = made["Role"]["Arn"]
        say(f"role {ROLE_NAME} created")
    else:
        aws("iam", "update-assume-role-policy", "--role-name", ROLE_NAME,
            "--policy-document", json.dumps(TRUST_POLICY))
        say(f"role {ROLE_NAME} exists")
    aws("iam", "put-role-policy", "--role-name", ROLE_NAME, "--policy-name", POLICY_NAME,
        "--policy-document", json.dumps(execution_policy(account)))
    say(f"{POLICY_NAME} written")
    aws("iam", "attach-role-policy", "--role-name", ROLE_NAME, "--policy-arn", BASIC_EXECUTION)
    say("AWSLambdaBasicExecutionRole attached")
    save_env("ROLE_ARN", found)

# MAIN

VERBS = {
    "check": check,
    "role": role,
}

if __name__ == "__main__":
    VERBS[verb(list(VERBS))]()
