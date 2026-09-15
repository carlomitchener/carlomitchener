from mrlypy.core.enums import Mode
from PIL import Image
import numpy as np
import os
from colors import create_frames_colors
from config import FORMAT
from models import Saga

# FRAMES

def frame_path(output_dir: str, key: str, index: int) -> str:
    return f"{output_dir}/{key}_{index:03d}.{FORMAT}"

def create_saga_frames(saga: Saga, output_dir: str) -> Saga:
    os.makedirs(output_dir, exist_ok=True)
    boundary = saga.boundary.value
    cursor = 0
    for seg, seg_len in zip(saga.segments, saga.segment_lengths):
        k = int(np.sum(seg.mask.cell.types)) + 1
        primary, secondary = create_frames_colors(seg, k)
        params = ({0: [primary], 1: secondary}, Mode.TAG)
        mask_types = seg.mask.cell.types
        for i, grid in enumerate(saga.grids[cursor:cursor + seg_len]):
            grid.neighbors(mask_types, mode=boundary)
            grid.paint(*params)
            image = grid.to_image(1).convert("RGB")
            image.save(frame_path(output_dir, saga.key, cursor + i + 1), format=FORMAT)
        cursor += seg_len
    print(f"frames {len(saga.grids)} -> {output_dir}")
    return saga

# POSTER

def create_saga_poster(source: str, path: str, size: int) -> str:
    Image.open(source).convert("RGB").resize((size, size), Image.NEAREST).save(path, format="WEBP", lossless=True)
    print(f"poster {source} -> {path}")
    return path
