import boto3
from config import AWS_ACCOUNT_ID, ROLE_ARN

scheduler_client = boto3.client("scheduler")
REGION = scheduler_client.meta.region_name

RATES = {
    "mrlyshop-automator": "rate(8 minutes)",
    "mrlyshop-storefront": "rate(8 minutes)",
}

# HELPERS

def schedule_exists(schedule_name: str) -> bool:
    try:
        scheduler_client.get_schedule(Name=schedule_name)
        return True
    except scheduler_client.exceptions.ResourceNotFoundException:
        return False

def get_schedule(schedule_name: str) -> dict:
    return scheduler_client.get_schedule(Name=schedule_name)

# DEPLOY

def deploy_schedule(function_name: str, schedule: str):
    schedule_name = f"{function_name}"
    lambda_arn = f"arn:aws:lambda:{REGION}:{AWS_ACCOUNT_ID}:function:{function_name}"
    print(f"Deploying: {schedule_name}")
    print(f"Schedule: {schedule}")
    config = {
        "Name": schedule_name,
        "ScheduleExpression": schedule,
        "ScheduleExpressionTimezone": "UTC",
        "State": "DISABLED",
        "FlexibleTimeWindow": {"Mode": "OFF"},
        "Target": {
            "Arn": lambda_arn,
            "RoleArn": ROLE_ARN,
            "RetryPolicy": {
                "MaximumRetryAttempts": 0,
                "MaximumEventAgeInSeconds": 60
            }
        }
    }
    if schedule_exists(schedule_name):
        print("Updating existing schedule")
        scheduler_client.update_schedule(**config)
        print("Schedule updated")
    else:
        print("Creating new schedule")
        scheduler_client.create_schedule(**config)
        print("Schedule created")
    return f"arn:aws:scheduler:{REGION}:{AWS_ACCOUNT_ID}:schedule/default/{schedule_name}"

# ENABLE

def enable_schedule(function_name: str):
    schedule_name = f"{function_name}"
    try:
        existing = get_schedule(schedule_name)
        scheduler_client.update_schedule(
            Name=schedule_name,
            ScheduleExpression=existing["ScheduleExpression"],
            ScheduleExpressionTimezone=existing.get("ScheduleExpressionTimezone", "UTC"),
            State="ENABLED",
            FlexibleTimeWindow=existing["FlexibleTimeWindow"],
            Target=existing["Target"]
        )
        print(f"Enabled schedule: {schedule_name}")
        return True
    except Exception as e:
        print(f"Error enabling schedule for {function_name}: {e}")
        return False

# DISABLE

def disable_schedule(function_name: str):
    schedule_name = f"{function_name}"
    try:
        existing = get_schedule(schedule_name)
        scheduler_client.update_schedule(
            Name=schedule_name,
            ScheduleExpression=existing["ScheduleExpression"],
            ScheduleExpressionTimezone=existing.get("ScheduleExpressionTimezone", "UTC"),
            State="DISABLED",
            FlexibleTimeWindow=existing["FlexibleTimeWindow"],
            Target=existing["Target"]
        )
        print(f"Disabled schedule: {schedule_name}")
        return True
    except Exception as e:
        print(f"Error disabling schedule for {function_name}: {e}")
        return False

# DELETE

def delete_schedule(function_name: str):
    schedule_name = f"{function_name}"
    try:
        scheduler_client.delete_schedule(Name=schedule_name)
        print(f"Deleted schedule: {schedule_name}")
        return True
    except Exception as e:
        print(f"Error deleting schedule for {function_name}: {e}")
        return False

# COMMANDS

def deploy(name: str):
    deploy_schedule(name, RATES[name])

def enable(name: str):
    enable_schedule(name)

def disable(name: str):
    disable_schedule(name)

def delete(name: str):
    delete_schedule(name)

if __name__ == "__main__":
    pass
    disable_schedule("mrlyshop-automator")
    disable_schedule("mrlyshop-storefront")
