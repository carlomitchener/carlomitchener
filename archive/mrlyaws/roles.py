import boto3
import json
from config import AWS_ACCOUNT_ID, ROLE_NAME
from config import (
    MRLYCDN_BUCKET,
    MRLYNET_BUCKET,
    MRLYSHOP_BUCKET,
)

iam_client = boto3.client("iam")

trust_policy = {
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Principal": {
                "Service": [
                    "lambda.amazonaws.com",
                    "scheduler.amazonaws.com"
                ]
            },
            "Action": "sts:AssumeRole"
        }
    ]
}

execution_policy = {
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "logs:CreateLogGroup",
                "logs:CreateLogStream",
                "logs:PutLogEvents"
            ],
            "Resource": "arn:aws:logs:*:*:*"
        },
        {
            "Effect": "Allow",
            "Action": [
                "s3:GetObject",
                "s3:PutObject",
                "s3:DeleteObject",
                "s3:ListBucket"
            ],
            "Resource": [
                f"arn:aws:s3:::{MRLYCDN_BUCKET}",
                f"arn:aws:s3:::{MRLYCDN_BUCKET}/*",
                f"arn:aws:s3:::{MRLYNET_BUCKET}",
                f"arn:aws:s3:::{MRLYNET_BUCKET}/*",
                f"arn:aws:s3:::{MRLYSHOP_BUCKET}",
                f"arn:aws:s3:::{MRLYSHOP_BUCKET}/*",
            ]
        },
        {
            "Effect": "Allow",
            "Action": "lambda:InvokeFunction",
            "Resource": f"arn:aws:lambda:*:{AWS_ACCOUNT_ID}:function:mrly*"
        }
    ]
}

# COMMANDS

def create_lambda_execution_role():
    role_arn = None
    try:
        print(f"Creating IAM role: {ROLE_NAME}")
        response = iam_client.create_role(
            RoleName=ROLE_NAME,
            AssumeRolePolicyDocument=json.dumps(trust_policy)
        )
        role_arn = response["Role"]["Arn"]
        print(f"Role created successfully!")
    except iam_client.exceptions.EntityAlreadyExistsException:
        print(f"Role {ROLE_NAME} already exists. Updating policies...")
        role_arn = iam_client.get_role(RoleName=ROLE_NAME)["Role"]["Arn"]
    except Exception as e:
        print(f"Error checking/creating role: {e}")
        return
    if role_arn:
        try:
            print(f"ARN: {role_arn}")
            print("Updating execution policy...")
            policy_name = "mrlypolicy"
            iam_client.put_role_policy(
                RoleName=ROLE_NAME,
                PolicyName=policy_name,
                PolicyDocument=json.dumps(execution_policy)
            )
            print("Execution policy updated successfully!")
            iam_client.attach_role_policy(
                RoleName=ROLE_NAME,
                PolicyArn="arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
            )
            print("Basic execution policy verified!")
            print(f"ROLE_ARN = \"{role_arn}\"")
        except Exception as e:
            print(f"Error updating policies: {e}")

if __name__ == "__main__":
    create_lambda_execution_role()
