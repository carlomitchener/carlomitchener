from mrlypy.core import cell
from PIL import Image
import numpy as np
import os
from colors import PRIMARIES, SECONDARIES, create_frames_colors
from config import FLASHES, FLASH_CONWAY, FORMAT
from enums import Boundary, Way
from models import Saga, Task

# FRAMES

def frame_path(output_dir: str, key: str, index: int) -> str:
    return f"{output_dir}/{key}_{index:03d}.{FORMAT}"

def create_saga_frames(saga: Saga, output_dir: str, rng) -> Saga:
    os.makedirs(output_dir, exist_ok=True)
    wrap = saga.boundary == Boundary.WRAP
    cursor = 0
    for seg, seg_len in zip(saga.segments, saga.segment_lengths):
        mask = seg.mask.types
        primary, secondary = create_frames_colors(seg, int(mask.sum()) + 1, rng)
        mapping = {0: [primary], 1: secondary}
        for i, grid in enumerate(saga.grids[cursor:cursor + seg_len]):
            painted = cell.paint(cell.neighbors(grid, mask, 1, wrap, "U8"), mapping, "Tag")
            image = Image.fromarray(painted["colors"], "RGBA").convert("RGB")
            image.save(frame_path(output_dir, saga.key, cursor + i + 1), format=FORMAT)
        cursor += seg_len
    print(f"frames {len(saga.grids)} -> {output_dir}")
    return saga

# MASKS

def flash_count(seg: Task) -> int:
    if seg.way == Way.CONWAY and not FLASH_CONWAY:
        return 0
    return FLASHES

def mask_path(output_dir: str, key: str, index: int) -> str:
    return f"{output_dir}/{key}_mask_{index:02d}.{FORMAT}"

def create_saga_masks(saga: Saga, output_dir: str) -> Saga:
    os.makedirs(output_dir, exist_ok=True)
    size = saga.grids[0]["types"].shape[0]
    for index, seg in enumerate(saga.segments):
        mask = seg.mask.types
        m = mask.shape[0]
        offset = (size - m) // 2
        canvas = np.zeros((size, size, 4), dtype=np.uint8)
        canvas[:, :, :] = PRIMARIES[seg.primary]
        color = np.array(SECONDARIES[seg.secondary], dtype=np.uint8)
        window = canvas[offset:offset + m, offset:offset + m]
        window[mask == 1] = color
        Image.fromarray(canvas, "RGBA").convert("RGB").save(mask_path(output_dir, saga.key, index), format=FORMAT)
    print(f"masks {len(saga.segments)} -> {output_dir}")
    return saga

# POSTER

def create_saga_poster(source: str, path: str, size: int) -> str:
    Image.open(source).convert("RGB").resize((size, size), Image.NEAREST).save(path, format="WEBP", lossless=True)
    print(f"poster {source} -> {path}")
    return path
