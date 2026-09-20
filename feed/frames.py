from mrlypy.core.enums import Mode
from PIL import Image
import numpy as np
import os
from colors import PRIMARIES, SECONDARIES, create_frames_colors
from config import FLASHES, FLASH_CONWAY, FORMAT
from enums import Way
from models import Saga, Task

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

# MASKS

def flash_count(seg: Task) -> int:
    if seg.way == Way.CONWAY and not FLASH_CONWAY:
        return 0
    return FLASHES

def mask_path(output_dir: str, key: str, index: int) -> str:
    return f"{output_dir}/{key}_mask_{index:02d}.{FORMAT}"

def create_saga_masks(saga: Saga, output_dir: str) -> Saga:
    os.makedirs(output_dir, exist_ok=True)
    size = saga.grids[0].types.shape[0]
    for index, seg in enumerate(saga.segments):
        mask = seg.mask.cell.types
        m = mask.shape[0]
        offset = (size - m) // 2
        canvas = np.zeros((size, size, 4), dtype=np.uint8)
        canvas[:, :, :] = PRIMARIES[seg.primary].to_rgba()
        color = np.array(SECONDARIES[seg.secondary].to_rgba(), dtype=np.uint8)
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
