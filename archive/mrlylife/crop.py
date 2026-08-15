import math
from mrlytwo import Cell2d
import numpy as np
from typing import List
from .helpers import logger

def crop_grids(grids: List[Cell2d]) -> List[Cell2d]:
    first_grid = grids[0]
    original_h, original_w = first_grid.types.shape
    heatmap = np.zeros_like(first_grid.types, dtype=np.int32)
    for grid in grids:
        heatmap += grid.types
    if not np.any(heatmap):
        logger.debug("Found nothing to crop (empty heatmap). Returning...")
        return grids
    rows = np.any(heatmap, axis=1)
    cols = np.any(heatmap, axis=0)
    rmin, rmax = np.where(rows)[0][[0, -1]]
    cmin, cmax = np.where(cols)[0][[0, -1]]
    rows_cropped = rmin + (original_h - 1 - rmax)
    cols_cropped = cmin + (original_w - 1 - cmax)
    if rows_cropped == 0 and cols_cropped == 0:
        logger.debug("Found nothing to crop. Returning...")
        return grids
    else:
        logger.debug(f"Cropping {rows_cropped} rows / {cols_cropped} columns")
    height = rmax - rmin + 1
    width = cmax - cmin + 1
    final_size = max(height, width)
    pad_h = final_size - height
    pad_w = final_size - width
    pad_top = pad_h // 2
    pad_bottom = pad_h - pad_top
    pad_left = pad_w // 2
    pad_right = pad_w - pad_left
    trimmed_grids = []
    for grid in grids:
        cropped_grid = grid.types[rmin:rmax + 1, cmin:cmax + 1]
        padded_cropped_grid = np.pad(
            cropped_grid,
            ((pad_top, pad_bottom), (pad_left, pad_right)),
            mode="constant",
            constant_values=0,
        )
        trimmed_grids.append(Cell2d(types=padded_cropped_grid))
    return trimmed_grids

def tessellate_grids(grids: List[Cell2d], min_canvas: int) -> List[Cell2d]:
    if not grids or min_canvas <= 0:
        return grids
    size = max(grids[0].types.shape)
    if size >= min_canvas:
        return grids
    n = math.ceil(min_canvas / size)
    logger.debug(f"Tessellating {size} -> {size * n} (x{n})")
    return [grid.copy().tile(n, n) for grid in grids]
