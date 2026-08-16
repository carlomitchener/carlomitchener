import glob
import json
import os
import shutil
import time
from helpers import frames_to_gif, frames_to_video, play_animation

ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

def copy_frame(source_dir, source_frame, target_dir, target_frame):
    source_path = f"{source_dir}/frame_{source_frame}.json"
    target_path = f"{target_dir}/frame_{target_frame}.json"
    shutil.copy2(source_path, target_path)

def append_sequence(source_dir: str, num_frames: int, current_frame: int, freeze_duration: int, reverse: bool = False):
    for i in range(num_frames):
        source_frame = num_frames - 1 - i if reverse else i
        copy_frame(source_dir, source_frame, f"{ROOT_DIR}/data/json/animation", current_frame)
        current_frame += 1
    freeze_frame = 0 if reverse else num_frames - 1
    for i in range(freeze_duration):
        copy_frame(source_dir, freeze_frame, f"{ROOT_DIR}/data/json/animation", current_frame)
        current_frame += 1
    return current_frame

def create_frames():
    os.makedirs(f"{ROOT_DIR}/data/json/animation", exist_ok=True)
    writing_frames = len(glob.glob(f"{ROOT_DIR}/data/json/writing/frame_*.json"))
    merging_frames = len(glob.glob(f"{ROOT_DIR}/data/json/merging/frame_*.json"))
    current_frame = 0
    FPS = 25
    freeze_duration = 25
    current_frame = append_sequence(f"{ROOT_DIR}/data/json/writing", writing_frames, current_frame, freeze_duration)
    current_frame = append_sequence(f"{ROOT_DIR}/data/json/merging", merging_frames, current_frame, freeze_duration)
    current_frame = append_sequence(f"{ROOT_DIR}/data/json/merging", merging_frames, current_frame, freeze_duration, reverse=True)
    current_frame = append_sequence(f"{ROOT_DIR}/data/json/writing", writing_frames, current_frame, freeze_duration, reverse=True)
    print(f"Generated: {ROOT_DIR}/data/json/animation/")
    print(f"Frames: {current_frame}")
    print(f"FPS: {FPS}")
    print(f"Freeze: {freeze_duration}")
    print(f"Duration: {current_frame / FPS:.1f} seconds")

def main():
    import writing
    import merging
    writing.create_frames()
    merging.create_frames()
    create_frames()
    frames_to_video(f"{ROOT_DIR}/data/json/animation", f"{ROOT_DIR}/data/animation/mrlyprod.mp4", 25)
    frames_to_gif(f"{ROOT_DIR}/data/json/animation", f"{ROOT_DIR}/data/animation/mrlyprod.gif", 25)
    play_animation(f"{ROOT_DIR}/data/json/animation", 25, "🟨", "🟪")

if __name__ == "__main__":
    main()
