import json
import os
import sys
from common import (
    AUTOMATOR_NAME,
    REGION,
    aws,
    gate,
    maybe,
    need,
    say,
    tmpfile,
    verb,
)

SCHEDULES = {
    "automator": {
        "name": AUTOMATOR_NAME,
        "function": AUTOMATOR_NAME,
        "rate": "rate(5 minutes)",
        "timezone": "UTC",
        "retries": 0,
        "age": 60,
    },
}

# STATE

def live(name):
    return maybe("scheduler", "get-schedule", "--name", name)

def function_arn(function):
    return f"arn:aws:lambda:{REGION}:{need('AWS_ACCOUNT_ID')}:function:{function}"

def target(spec):
    return {
        "Arn": function_arn(spec["function"]),
        "RoleArn": need("ROLE_ARN"),
        "Input": "{}",
        "RetryPolicy": {
            "MaximumRetryAttempts": spec["retries"],
            "MaximumEventAgeInSeconds": spec["age"],
        },
    }

def write(spec, state, exists):
    path = tmpfile(json.dumps(target(spec)), ".json")
    try:
        aws(
            "scheduler", "update-schedule" if exists else "create-schedule",
            "--name", spec["name"],
            "--schedule-expression", spec["rate"],
            "--schedule-expression-timezone", spec["timezone"],
            "--state", state,
            "--flexible-time-window", "Mode=OFF",
            "--target", f"file://{path}",
        )
    finally:
        os.remove(path)

# VERBS

def show():
    for key, spec in SCHEDULES.items():
        found = live(spec["name"])
        if not found:
            say(f"{key:<12} {spec['name']:<28} none yet")
            continue
        say(f"{key:<12} {spec['name']:<28} {found['State']} {found['ScheduleExpression']}")

def sync():
    key = need_key()
    spec = SCHEDULES[key]
    found = live(spec["name"])
    state = found["State"] if found else "DISABLED"
    steps = [
        f"{'update' if found else 'create'} schedule {spec['name']}",
        f"{spec['rate']} {spec['timezone']}, flexible window OFF",
        f"target {spec['function']} through ROLE_ARN, retries {spec['retries']}, age {spec['age']} s",
        f"state {state}",
    ]
    if not gate(f"schedules sync {key}", steps): return
    write(spec, state, found is not None)
    say(f"synced {spec['name']} at {state}")

def switch(state):
    key = need_key()
    spec = SCHEDULES[key]
    found = live(spec["name"])
    if not found:
        raise SystemExit(f"refuse: {spec['name']} does not exist, sync it first")
    if not gate(f"schedules {state.lower()} {key}", [
        f"{spec['name']} {found['State']} -> {state}",
    ]): return
    write(spec, state, True)
    say(f"{spec['name']} is {state}")

def enable():
    switch("ENABLED")

def disable():
    switch("DISABLED")

# MAIN

def need_key():
    if len(sys.argv) < 3 or sys.argv[2].startswith("--"):
        raise SystemExit("refuse: schedule is required (" + " ".join(SCHEDULES) + ")")
    key = sys.argv[2]
    if key not in SCHEDULES:
        raise SystemExit(f"refuse: {key} is not a schedule")
    return key

ACTIONS = {
    "list": show,
    "sync": sync,
    "enable": enable,
    "disable": disable,
}

if __name__ == "__main__":
    ACTIONS[verb(list(ACTIONS))]()
