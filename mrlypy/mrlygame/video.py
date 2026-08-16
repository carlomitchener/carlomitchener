import glob
import os
import subprocess
from config import FORMAT, FPS, FRAMES_DIR, FREEZE_DURATION, HEATMAP_DIR, HEATMAP_FPS, INTER_SEGMENT_FREEZE, OUTPUT_DIR, SIZE
from music import compose_saga_audio

# FFMPEG

def run_ffmpeg(cmd):
    result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
    if result.returncode != 0:
        raise RuntimeError(f"ffmpeg failed: {result.stderr}")

# HELPERS

def _saga_frame_entries(frame_dir, fmt, fps, outer_freeze, boundary_freeze, segment_lengths):
    frames = sorted(glob.glob(f"{frame_dir}/*.{fmt}"))
    if not frames:
        return []
    entries = [(frames[0], outer_freeze)]
    cursor = 0
    for seg_i, seg_len in enumerate(segment_lengths):
        for path in frames[cursor:cursor + seg_len]:
            entries.append((path, 1.0 / fps))
        if seg_i < len(segment_lengths) - 1:
            entries.append((frames[cursor + seg_len - 1], boundary_freeze))
        cursor += seg_len
    entries.append((frames[-1], outer_freeze))
    return entries

def _encode(entries, audio, output, size, fps):
    output_dir = os.path.dirname(output)
    concat_path = f"{output_dir}/concat.txt"
    with open(concat_path, "w") as f:
        for path, duration in entries:
            f.write(f"file '{os.path.abspath(path)}'\n")
            f.write(f"duration {duration}\n")
        if entries:
            f.write(f"file '{os.path.abspath(entries[-1][0])}'\n")
    vf = f"scale={size}:{size}:flags=neighbor"
    if os.path.exists(audio):
        cmd = f"ffmpeg -y -f concat -safe 0 -i {concat_path} -i {audio} -vf '{vf}' -c:v libx264 -c:a aac -b:a 128k -ar 44100 -r {fps} -af \"afade=t=in:st=0:d=0.25,areverse,afade=t=in:st=0:d=0.25,areverse\" -pix_fmt yuv420p {output}"
    else:
        cmd = f"ffmpeg -y -f concat -safe 0 -i {concat_path} -vf '{vf}' -c:v libx264 -r {fps} -pix_fmt yuv420p {output}"
    run_ffmpeg(cmd)
    os.remove(concat_path)
    print(f"Saved: {output}")

# SAGA VIDEO

def create_saga_video(saga):
    output_dir = f"{OUTPUT_DIR}/{saga.key}"
    compose_saga_audio(saga)
    frames_entries = _saga_frame_entries(
        f"{output_dir}/{FRAMES_DIR}",
        FORMAT, FPS, FREEZE_DURATION, INTER_SEGMENT_FREEZE,
        saga.segment_lengths,
    )
    heatmap_entries = _saga_frame_entries(
        f"{output_dir}/{HEATMAP_DIR}",
        FORMAT, HEATMAP_FPS, FREEZE_DURATION, INTER_SEGMENT_FREEZE,
        saga.segment_lengths,
    )
    _encode(
        frames_entries + heatmap_entries,
        f"{output_dir}/{saga.key}.wav",
        f"{output_dir}/{saga.key}.mp4",
        SIZE, max(FPS, HEATMAP_FPS) * 2,
    )
