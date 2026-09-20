import glob
import os
import subprocess
from config import CRF, WEB, WEB_MIN, FORMAT, FPS, FRAMES_DIR, FREEZE_DURATION, HEATMAP_DIR, HEATMAP_FPS, INTER_SEGMENT_FREEZE, MASKS_DIR, MASTER, PRESET, RATE, SIZE
from frames import flash_count, mask_path
from music import compose_saga_audio

# FFMPEG

def run_ffmpeg(ffmpeg, args):
    done = subprocess.run([ffmpeg, "-y", "-hide_banner", "-loglevel", "error", *args], capture_output=True, text=True)
    if done.returncode != 0:
        raise RuntimeError(f"ffmpeg failed: {done.stderr.strip()}")

# CONCAT

def _entries(frame_dir, fps, outer_freeze, boundary_freeze, segment_lengths, masks=None):
    frames = sorted(glob.glob(f"{frame_dir}/*.{FORMAT}"))[:sum(segment_lengths)]
    if not frames:
        return []
    entries = [] if masks else [(frames[0], outer_freeze)]
    cursor = 0
    for seg_i, seg_len in enumerate(segment_lengths):
        if masks:
            for _ in range(masks[seg_i][1]):
                entries.append((frames[cursor], 1.0 / fps))
                entries.append((masks[seg_i][0], 1.0 / fps))
        for path in frames[cursor:cursor + seg_len]:
            entries.append((path, 1.0 / fps))
        if seg_i < len(segment_lengths) - 1:
            entries.append((frames[cursor + seg_len - 1], boundary_freeze))
        cursor += seg_len
    entries.append((frames[-1], outer_freeze))
    return entries

def _write_concat(entries, path):
    with open(path, "w") as handle:
        for frame, duration in entries:
            handle.write(f"file '{os.path.abspath(frame)}'\n")
            handle.write(f"duration {duration}\n")
        handle.write(f"file '{os.path.abspath(entries[-1][0])}'\n")
    return path

def _steps(entries):
    steps = []
    clock = 0.0
    last = None
    for frame, duration in entries:
        if frame != last:
            steps.append(round(clock, 4))
            last = frame
        clock += duration
    return steps

# SIZE

def web_size(canvas):
    scale = -(-WEB_MIN // canvas)
    if canvas * scale % 2:
        scale += 1
    return canvas * scale

# ENCODE

VIDEO = ["-c:v", "libx264", "-crf", str(CRF), "-preset", PRESET, "-pix_fmt", "yuv420p", "-movflags", "+faststart"]
AUDIO = ["-c:a", "aac", "-b:a", "128k", "-ar", "44100", "-af", "afade=t=in:st=0:d=0.25,areverse,afade=t=in:st=0:d=0.25,areverse"]

def _encode(ffmpeg, concat, audio, frames, size, output):
    args = ["-f", "concat", "-safe", "0", "-i", concat, "-i", audio, "-frames:v", str(frames)]
    args += ["-vf", f"scale={size}:{size}:flags=neighbor", "-r", str(RATE)]
    run_ffmpeg(ffmpeg, args + VIDEO + AUDIO + [output])
    return output

# SAGA VIDEOS

def create_saga_videos(saga, work_dir, out_dir, ffmpeg):
    os.makedirs(out_dir, exist_ok=True)
    audio = compose_saga_audio(saga, f"{work_dir}/{saga.key}.wav")
    masks = [(mask_path(f"{work_dir}/{MASKS_DIR}", saga.key, i), flash_count(seg)) for i, seg in enumerate(saga.segments)]
    entries = _entries(f"{work_dir}/{FRAMES_DIR}", FPS, FREEZE_DURATION, INTER_SEGMENT_FREEZE, saga.segment_lengths, masks)
    entries += _entries(f"{work_dir}/{HEATMAP_DIR}", HEATMAP_FPS, FREEZE_DURATION, INTER_SEGMENT_FREEZE, saga.segment_lengths)
    concat = _write_concat(entries, f"{work_dir}/concat.txt")
    duration = round(sum(duration for _, duration in entries), 3)
    frames = round(duration * RATE)
    size = web_size(int(saga.grids[0].types.shape[0]))
    _encode(ffmpeg, concat, audio, frames, SIZE, f"{out_dir}/{saga.key}{MASTER}")
    _encode(ffmpeg, concat, audio, frames, size, f"{out_dir}/{saga.key}{WEB}")
    print(f"videos {duration} s, {frames} frames, web {size} px -> {out_dir}")
    return {"duration": duration, "frames": frames, "size": size, "steps": _steps(entries)}
