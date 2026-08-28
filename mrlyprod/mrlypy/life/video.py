import os
import subprocess
from .helpers import logger

def create_video(frames_dir: str, output_path: str, fps: int = 8, format: str = "png", prefix: str = "frame") -> str:
    logger.debug(f"Creating video from {frames_dir}")
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    pattern = f"{frames_dir}/{prefix}_%03d.{format}"
    run_ffmpeg(pattern, output_path, fps)
    logger.info(f"Saved: {output_path}")
    return output_path

def run_ffmpeg(pattern: str, output_name: str, fps: int):
    cmd = [
        "ffmpeg", "-y",
        "-framerate", str(fps),
        "-i", pattern,
        "-vf", "pad=ceil(iw/2)*2:ceil(ih/2)*2",
        "-c:v", "libx264",
        "-r", str(fps),
        "-pix_fmt", "yuv420p",
        output_name,
    ]
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.stdout:
        logger.debug(result.stdout)
    if result.stderr:
        logger.debug(result.stderr)
    if result.returncode != 0:
        raise RuntimeError(f"ffmpeg failed with exit code {result.returncode}")
