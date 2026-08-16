import os
import shutil
import subprocess
import sys
import zipfile

IMPLEMENTATION = "cp"
PYTHON_VERSION = "3.13"
PLATFORM = "manylinux_2_17_aarch64"
ZIP_DIR = "zip"

PACKAGE_FACTORY = {
    "boto3": "boto3",
    "hfhub": "huggingface_hub",
    "numpy": "numpy",
    "pillow": "Pillow",
    "requests": "requests",
}

# HELPERS

def clean_build_artifacts(layer_name: str):
    build_dir = layer_name
    zip_file = f"{ZIP_DIR}/{layer_name}.zip"
    if os.path.exists(build_dir):
        shutil.rmtree(build_dir)
    if os.path.exists(zip_file):
        os.remove(zip_file)

def build_layer(layer_name: str):
    build_dir = layer_name
    zip_file = f"{ZIP_DIR}/{layer_name}.zip"
    print(f"Building: {layer_name}")
    clean_build_artifacts(layer_name)
    os.makedirs(f"{build_dir}/python/", exist_ok=True)
    os.makedirs(ZIP_DIR, exist_ok=True)
    print(f"Installing: {PACKAGE_FACTORY[layer_name]} (Linux/ARM64/Py{PYTHON_VERSION})")
    subprocess.run([
        sys.executable, "-m", "pip", "install", PACKAGE_FACTORY[layer_name],
        "--implementation", IMPLEMENTATION,
        "--python-version", PYTHON_VERSION,
        "--platform", PLATFORM,
        "--only-binary=:all:",
        "-t", f"{build_dir}/python/"
    ], check=True)
    print("Creating: zip file")
    with zipfile.ZipFile(zip_file, "w", zipfile.ZIP_DEFLATED) as zf:
        for root, dirs, files in os.walk(build_dir):
            for file in files:
                file_path = os.path.join(root, file)
                arcname = os.path.relpath(file_path, build_dir)
                zf.write(file_path, arcname)
    shutil.rmtree(build_dir)
    print(f"{layer_name} layer created as {zip_file}")

def build_ffmpeg():
    layer_name = "ffmpeg"
    build_dir = layer_name
    zip_file = f"{ZIP_DIR}/{layer_name}.zip"
    print(f"Building: {layer_name}")
    clean_build_artifacts(layer_name)
    os.makedirs(f"{build_dir}/bin/", exist_ok=True)
    os.makedirs(ZIP_DIR, exist_ok=True)
    print("Downloading: ffmpeg static build (ARM64)")
    ffmpeg_url = "https://johnvansickle.com/ffmpeg/builds/ffmpeg-git-arm64-static.tar.xz"
    tar_file = "ffmpeg-git.tar.xz"
    subprocess.run(["curl", "-L", "-o", tar_file, ffmpeg_url], check=True)
    print("Extracting: ffmpeg")
    subprocess.run(["tar", "-xf", tar_file], check=True)
    extracted_dirs = [d for d in os.listdir(".") if d.startswith("ffmpeg-") and os.path.isdir(d) and "arm64" in d]
    if not extracted_dirs:
        raise Exception("Could not find extracted ffmpeg directory")
    source_dir = extracted_dirs[0]
    shutil.move(f"{source_dir}/ffmpeg", f"{build_dir}/bin/ffmpeg")
    os.remove(tar_file)
    shutil.rmtree(source_dir)
    print("Creating: zip file")
    with zipfile.ZipFile(zip_file, "w", zipfile.ZIP_DEFLATED) as zf:
        for root, dirs, files in os.walk(build_dir):
            for file in files:
                file_path = os.path.join(root, file)
                arcname = os.path.relpath(file_path, build_dir)
                info = zipfile.ZipInfo.from_file(file_path, arcname)
                if file == "ffmpeg":
                    info.external_attr = 0o100755 << 16
                else:
                    info.external_attr = (info.external_attr & 0xFFFF0000) | (0o644 << 16)
                    if os.access(file_path, os.X_OK):
                         info.external_attr = (info.external_attr & 0xFFFF0000) | (0o755 << 16)
                zf.writestr(info, open(file_path, 'rb').read())
    shutil.rmtree(build_dir)
    print(f"{layer_name} layer created as {zip_file}")

# COMMANDS

if __name__ == "__main__":
    pass
