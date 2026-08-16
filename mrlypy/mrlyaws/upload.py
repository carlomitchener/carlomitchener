import boto3

lambda_client = boto3.client("lambda")

# HELPERS

def upload_layer(layer_name: str, zip_file_path: str):
    print(f"Uploading: {layer_name}")
    with open(zip_file_path, "rb") as f:
        zip_content = f.read()
    try:
        response = lambda_client.publish_layer_version(
            LayerName=layer_name,
            Content={
                "ZipFile": zip_content
            },
            CompatibleRuntimes=["python3.13"],
            CompatibleArchitectures=["arm64"]
        )
        layer_arn = response["LayerVersionArn"]
        print(f"{layer_name} uploaded successfully!")
        print(f"ARN: {layer_arn}")
        clean_name = layer_name.replace('-', '_').upper()
        constant_name = f"{clean_name}_ARN"
        print(f"{constant_name}={layer_arn}")
        return layer_arn
    except Exception as e:
        print(f"Error uploading {layer_name} layer: {e}")
        raise e

if __name__ == "__main__":
    pass
