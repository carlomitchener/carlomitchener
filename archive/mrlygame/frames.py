from mrlycore.enums import Mode
import numpy as np
import os
from colors import create_frames_colors
from config import FORMAT, FRAMES_DIR, OUTPUT_DIR
from models import Saga

def create_saga_frames(saga: Saga, output_dir: str = None) -> Saga:
    print(f"Creating frames for saga: {saga.key}")
    output_dir = output_dir or f"{OUTPUT_DIR}/{saga.key}/{FRAMES_DIR}"
    os.makedirs(output_dir, exist_ok=True)
    boundary = saga.boundary.value
    cursor = 0
    for seg, seg_len in zip(saga.segments, saga.segment_lengths):
        k = int(np.sum(seg.mask.cell.types)) + 1
        print(f"Segment {seg.key} secondary count: {k}")
        primary, secondary = create_frames_colors(seg, k)
        params = ({0: [primary], 1: secondary}, Mode.TAG)
        mask_types = seg.mask.cell.types
        for i, grid in enumerate(saga.grids[cursor:cursor + seg_len]):
            grid.neighbors(mask_types, mode=boundary)
            grid.paint(*params)
            image = grid.to_image(1).convert("RGB")
            fp = f"{output_dir}/{saga.key}_{cursor + i + 1:03d}.{FORMAT}"
            image.save(fp, format=FORMAT)
            print(f"Saved: {fp}")
        cursor += seg_len
    print(f"Saved {len(saga.grids)} frames to {output_dir}")
    return saga
