import mrlylife
import subprocess
from typing import List
from mrlycore.state import choice
from mrlylife.crop import crop_grids
from mrlylife.enums import Fate
from mrlytwo import Cell2d
from config import MAX_GENERATIONS, MAX_SEGMENTS, MIN_GENERATIONS
from frames import create_saga_frames
from heatmap import create_saga_heatmap
from models import Saga, Task
from setup import setup_saga, setup_segment
from video import create_saga_video

# SEGMENT

def _segment_life_config(task: Task) -> mrlylife.Config:
    padding = (task.canvas_unit_width - task.tile.grid_unit_width) // 2
    return mrlylife.Config(
        max_generations=MAX_GENERATIONS,
        birth_counts=task.birth_counts,
        survive_counts=task.survive_counts,
        boundary=task.boundary,
        padding=padding,
        grid_size=task.tile.grid_size,
    )

def _generate_segment(saga: Saga, index: int, prev_grid: Cell2d) -> Task:
    task = setup_segment(saga, index, prev_grid)
    config = _segment_life_config(task)
    result = mrlylife.animate(config, grid=task.tile.cell, mask=task.mask.cell)
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

def _finalize_saga(saga: Saga) -> Saga:
    all_grids = []
    for seg in saga.segments:
        all_grids.extend(seg.result.grids)
    saga.grids = crop_grids(all_grids)
    saga.segment_lengths = [len(s.result.grids) for s in saga.segments]
    saga.count = len(saga.grids)
    saga.time = round(sum((s.result.time or 0.0) for s in saga.segments), 2)
    saga.fate = saga.segments[-1].result.fate if saga.segments else None
    return saga

def generate_saga() -> Saga:
    print(f"Generating saga")
    while True:
        saga = Saga()
        saga = setup_saga(saga)
        prev_grid = None
        reached_life = False
        for index in range(MAX_SEGMENTS):
            segment = _generate_segment(saga, index, prev_grid)
            saga.segments.append(segment)
            if segment.result.fate == Fate.LIFE:
                print(f"Segment {index} LIFE. Saga complete.")
                reached_life = True
                break
            length = _pivot_length(segment)
            _truncate_segment(segment, length)
            print(f"Segment {index} non-LIFE ({segment.result.fate.value}). Pivoting at length {length}.")
            prev_grid = segment.result.grids[-1].copy()
        if reached_life:
            break
        print(f"Saga hit MAX_SEGMENTS ({MAX_SEGMENTS}) without LIFE. Discarding and retrying...")
    saga = _finalize_saga(saga)
    return saga

# CLIPBOARD

def copy_to_clipboard(text: str):
    subprocess.run(["pbcopy"], input=text.encode(), check=True)
    print(f"Copied to clipboard: {text}")

# PIPELINE

def print_social(saga: Saga):
    print()
    social_links = [
        "instagram",
        "reddit",
        "tiktok",
        "twitter",
        "x",
        "youtube",
    ]
    for link in social_links:
        print(f"https://www.{link}.com")
    print()
    print(saga.key)
    print()

def main():
    saga = generate_saga()
    create_saga_frames(saga)
    create_saga_heatmap(saga)
    create_saga_video(saga)
    print_social(saga)
    answer = input("Copy key to clipboard? (y/n): ").strip().lower()
    if answer == "y":
        copy_to_clipboard(saga.key)
    return None

if __name__ == "__main__":
    main()
