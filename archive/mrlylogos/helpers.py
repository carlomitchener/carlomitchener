import glob
import json
import mrlytwo as mp
import os
import shutil
import subprocess
import time
from mrlycore.colors import black, white
from mrlycore.enums import Mode
from PIL import Image

def play_animation(frames_dir: str, speed: int, fill: str = "1", void: str = "0"):
    frame_files = glob.glob(f"{frames_dir}/frame_*.json")
    frame_files.sort(key=lambda x: int(x.split("_")[1].split(".")[0]))
    delay = 1.0 / speed
    mapping = {0: void, 1: fill}
    os.system("clear")
    for frame_file in frame_files:
        with open(frame_file, "r") as f:
            frame_data = json.load(f)
        cell = mp.Cell2d.from_strings(frame_data)
        frame_str = "\n".join(cell.text(mapping))
        print("\033[H" + frame_str)
        time.sleep(delay)

def json_to_image(json_file: str, output_file: str, scale: int = 10):
    with open(json_file, "r") as f:
        frame_data = json.load(f)
    cell = mp.Cell2d.from_strings(frame_data)
    mapping = {0: [white], 1: [black]}
    cell = cell.paint(mapping, Mode.TYPE)
    img = cell.to_image(scale)
    img.save(output_file)

def convert_frames_to_images(frames_dir: str, output_dir: str = "images"):
    os.makedirs(output_dir, exist_ok=True)
    frame_files = glob.glob(f"{frames_dir}/frame_*.json")
    frame_files.sort(key=lambda x: int(x.split("_")[1].split(".")[0]))
    for frame_file in frame_files:
        frame_num = frame_file.split("_")[1].split(".")[0]
        output_file = f"{output_dir}/frame_{frame_num:0>3}.png"
        json_to_image(frame_file, output_file)

def create_gif(images_dir: str, output_name: str, fps: int):
    image_files = glob.glob(f"{images_dir}/frame_*.png")
    image_files.sort()
    images = [Image.open(f) for f in image_files]
    duration_ms = int(1000 / fps)
    images[0].save(output_name, save_all=True, append_images=images[1:], duration=duration_ms, loop=0)

def create_video(images_dir: str, output_name: str, fps: int):
    pattern = f"{images_dir}/frame_%03d.png"
    cmd = f"ffmpeg -y -framerate {fps} -i {pattern} -c:v libx264 -r {fps} -pix_fmt yuv420p {output_name}"
    subprocess.run(cmd, shell=True)

def frames_to_video(frames_dir: str, output_name: str, fps: int):
    os.makedirs(os.path.dirname(output_name), exist_ok=True)
    temp_images_dir = f"{frames_dir}_temp_images"
    convert_frames_to_images(frames_dir, temp_images_dir)
    create_video(temp_images_dir, output_name, fps)
    if os.path.exists(temp_images_dir):
        shutil.rmtree(temp_images_dir)
    print(f"Created: {output_name}")

def frames_to_gif(frames_dir: str, output_name: str, fps: int):
    os.makedirs(os.path.dirname(output_name), exist_ok=True)
    temp_images_dir = f"{frames_dir}_temp_images"
    convert_frames_to_images(frames_dir, temp_images_dir)
    create_gif(temp_images_dir, output_name, fps)
    if os.path.exists(temp_images_dir):
        shutil.rmtree(temp_images_dir)
    print(f"Created: {output_name}")
