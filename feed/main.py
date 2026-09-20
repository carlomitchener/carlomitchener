import hashlib
import json
import os
import random
import shutil
import time
from datetime import datetime, timezone
from typing import Any, Dict, List
import mrlypy.life
import numpy as np
from mrlypy.core.state import choice, seed as seed_state
from mrlypy.life.crop import crop_grids
from mrlypy.life.enums import Fate
from mrlypy.two import Cell2d
from config import ATTEMPTS, DATA_DIR, FLASHES, FPS, FRAMES_DIR, POSTS, HEATMAP_DIR, HEATMAP_FPS, INDEX, LIVE_DAYS, MANIFEST, MASKS_DIR, MAX_GENERATIONS, MAX_SEGMENTS, MIN_GENERATIONS, POSTER, RATE, VERSION, files
from frames import create_saga_frames, create_saga_masks, create_saga_poster, frame_path
from heatmap import create_saga_heatmap
from models import Saga, Task
from setup import setup_saga, setup_segment
from video import create_saga_videos

FFMPEG = shutil.which("ffmpeg") or "/opt/bin/ffmpeg"

# NAME

def name_for(seed: int) -> str:
    return hashlib.sha256(str(seed).encode()).hexdigest()[:8]

# SEGMENT

def _segment_life_config(task: Task) -> mrlypy.life.Config:
    padding = (task.canvas_unit_width - task.tile.grid_unit_width) // 2
    return mrlypy.life.Config(
        max_generations=MAX_GENERATIONS,
        birth_counts=task.birth_counts,
        survive_counts=task.survive_counts,
        boundary=task.boundary,
        padding=padding,
        grid_size=task.tile.grid_size,
    )

def _alive(grids: List[Cell2d]) -> List[Cell2d]:
    for i, grid in enumerate(grids):
        if not np.any(grid.types):
            return grids[:i]
    return grids

def _generate_segment(saga: Saga, index: int, prev_grid: Cell2d) -> Task:
    task = setup_segment(saga, index, prev_grid)
    config = _segment_life_config(task)
    result = mrlypy.life.animate(config, grid=task.tile.cell, mask=task.mask.cell)
    alive = _alive(result.grids)
    if len(alive) < len(result.grids):
        result.grids = alive
        result.fate = Fate.DEAD
    result.count = len(result.grids)
    task.result = result
    task.count = result.count
    print(f"Segment {index} animated ({result.fate.value}, count={result.count}).")
    return task

def _length_options(count: int) -> List[int]:
    lo = min(MIN_GENERATIONS, count)
    lo_mul4 = ((lo + 3) // 4) * 4
    hi_mul4 = (count // 4) * 4
    if hi_mul4 < lo_mul4:
        return []
    return list(range(lo_mul4, hi_mul4 + 1, 4))

def _pivot_length(segment: Task) -> int:
    options = _length_options(segment.count)
    if not options:
        return segment.count
    return choice(options)

def _truncate_segment(segment: Task, length: int) -> Task:
    segment.result.grids = segment.result.grids[:length]
    segment.count = len(segment.result.grids)
    segment.result.count = segment.count
    return segment

# SAGA

def _pad_grids(grids: List[Cell2d], size: int) -> List[Cell2d]:
    current = grids[0].types.shape[0]
    if current >= size:
        return grids
    before = (size - current) // 2
    after = size - current - before
    return [Cell2d(types=np.pad(g.types, ((before, after), (before, after)), mode="constant", constant_values=0)) for g in grids]

def _finalize_saga(saga: Saga, attempts: int) -> Saga:
    all_grids = []
    for seg in saga.segments:
        all_grids.extend(seg.result.grids)
    largest_mask = max(seg.mask.cell.types.shape[0] for seg in saga.segments)
    saga.grids = _pad_grids(crop_grids(all_grids), largest_mask)
    saga.segment_lengths = [len(s.result.grids) for s in saga.segments]
    saga.count = len(saga.grids)
    saga.time = round(sum((s.result.time or 0.0) for s in saga.segments), 2)
    saga.fate = saga.segments[-1].result.fate if saga.segments else None
    saga.attempts = attempts
    return saga

def generate_saga(seed: int, key: str) -> Saga:
    for attempt in range(1, ATTEMPTS + 1):
        saga = setup_saga(Saga(), seed, key)
        prev_grid = None
        for index in range(MAX_SEGMENTS):
            segment = _generate_segment(saga, index, prev_grid)
            if segment.count < MIN_GENERATIONS:
                print(f"Segment {index} ran only {segment.count} generations, retrying.")
                break
            saga.segments.append(segment)
            if segment.result.fate == Fate.LIFE:
                print(f"Saga reached LIFE on attempt {attempt}.")
                return _finalize_saga(saga, attempt)
            _truncate_segment(segment, _pivot_length(segment))
            prev_grid = segment.result.grids[-1].copy()
        print(f"Attempt {attempt} found no LIFE, retrying.")
    raise RuntimeError(f"seed {seed} found no LIFE in {ATTEMPTS} attempts")

# STORY

def _count(n: int, word: str) -> str:
    return f"{n} {word}" if n == 1 else f"{n} {word}s"

def _story(saga: Saga) -> str:
    ways = " then ".join(dict.fromkeys(s.way.value for s in saga.segments))
    cells = int(saga.grids[0].types.shape[0])
    return (f"{_count(len(saga.segments), 'segment')}, {_count(saga.count, 'generation')} "
            f"on a {cells} cell grid, {saga.boundary.value} boundary, {ways}, ending {saga.fate.value}")

# MANIFEST

def _segment_rows(saga: Saga) -> List[Dict[str, Any]]:
    rows = []
    for index, (seg, length) in enumerate(zip(saga.segments, saga.segment_lengths)):
        rows.append({
            "index": index,
            "key": seg.key,
            "way": seg.way.value if seg.way else None,
            "path": seg.path.value if seg.path else None,
            "secondary": seg.secondary.value if seg.secondary else None,
            "fate": seg.result.fate.value if seg.result else None,
            "generations": length,
            "tile": seg.tile.to_dict() if seg.tile else None,
            "mask": seg.mask.to_dict() if seg.mask else None,
            "music": seg.music.to_dict() if seg.music else None,
        })
    return rows

def _sizes(out_dir: str, key: str) -> Dict[str, int]:
    return {name: os.path.getsize(f"{out_dir}/{name}") for name in files(key) if not name.endswith(MANIFEST)}

def _manifest(saga: Saga, at: str, videos: Dict[str, Any], out_dir: str) -> Dict[str, Any]:
    first = saga.segments[0]
    return {
        "v": VERSION,
        "name": saga.key,
        "seed": saga.seed,
        "at": at,
        "story": _story(saga),
        "fps": FPS,
        "flashes": FLASHES,
        "heatmap_fps": HEATMAP_FPS,
        "rate": RATE,
        "canvas": int(saga.grids[0].types.shape[0]),
        "canvas_unit_width": saga.canvas_unit_width,
        "canvas_unit_height": saga.canvas_unit_height,
        "boundary": saga.boundary.value if saga.boundary else None,
        "primary": saga.primary.value if saga.primary else None,
        "fate": saga.fate.value if saga.fate else None,
        "attempts": saga.attempts,
        "tile": first.tile.to_dict() if first.tile else None,
        "mask": first.mask.to_dict() if first.mask else None,
        "segments": _segment_rows(saga),
        "generations": saga.count,
        "poster_generation": poster_frame(saga),
        "frames": videos["frames"],
        "duration": videos["duration"],
        "size": videos["size"],
        "steps": videos["steps"],
        "sizes": _sizes(out_dir, saga.key),
        "files": files(saga.key),
    }

def index_row(manifest: Dict[str, Any]) -> Dict[str, Any]:
    return {
        "name": manifest["name"],
        "seed": manifest["seed"],
        "at": manifest["at"],
        "duration": manifest["duration"],
        "frames": manifest["frames"],
        "size": manifest["size"],
        "segments": len(manifest["segments"]),
        "canvas": manifest["canvas"],
        "story": manifest["story"],
    }

def expired(rows: List[Dict[str, Any]], now: datetime) -> List[Dict[str, Any]]:
    cutoff = now.timestamp() - LIVE_DAYS * 86400
    return [item for item in rows if datetime.fromisoformat(item["at"].replace("Z", "+00:00")).timestamp() < cutoff]

def write_index(root: str, row: Dict[str, Any]) -> str:
    path = os.path.join(root, INDEX)
    rows = []
    if os.path.exists(path):
        with open(path) as handle:
            rows = [item for item in json.load(handle) if item.get("name") != row["name"]]
    for item in expired(rows, datetime.now(timezone.utc)):
        shutil.rmtree(os.path.join(root, POSTS, item["name"]), ignore_errors=True)
        rows.remove(item)
        print(f"reap {item['name']}")
    rows.insert(0, row)
    with open(path, "w") as handle:
        json.dump(rows, handle)
    return path

# POSTER

def poster_frame(saga: Saga) -> int:
    longest = max(range(len(saga.segment_lengths)), key=lambda i: saga.segment_lengths[i])
    return sum(saga.segment_lengths[:longest + 1])

# MAKE

def make(seed: int, root: str) -> Dict[str, Any]:
    marks = {}
    clock = time.time()

    def mark(stage):
        nonlocal clock
        now = time.time()
        marks[stage] = int((now - clock) * 1000)
        clock = now
        print(f"stage {stage} {marks[stage]} ms")

    at = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    key = name_for(seed)
    seed_state(seed)
    saga = generate_saga(seed, key)
    mark("saga")
    work = os.path.join(root, "work", key)
    out = os.path.join(root, POSTS, key)
    shutil.rmtree(work, ignore_errors=True)
    create_saga_frames(saga, f"{work}/{FRAMES_DIR}")
    create_saga_masks(saga, f"{work}/{MASKS_DIR}")
    mark("frames")
    create_saga_heatmap(saga, f"{work}/{HEATMAP_DIR}")
    mark("heatmap")
    videos = create_saga_videos(saga, work, out, FFMPEG)
    mark("videos")
    create_saga_poster(frame_path(f"{work}/{HEATMAP_DIR}", key, poster_frame(saga)), f"{out}/{key}{POSTER}", videos["size"])
    mark("poster")
    manifest = _manifest(saga, at, videos, out)
    with open(f"{out}/{key}{MANIFEST}", "w") as handle:
        json.dump(manifest, handle)
    row = index_row(manifest)
    write_index(root, row)
    return {"manifest": manifest, "row": row, "dir": out, "ms": marks}

if __name__ == "__main__":
    record = make(random.getrandbits(32), DATA_DIR)
    print()
    print(record["manifest"]["story"])
    print(record["dir"])
