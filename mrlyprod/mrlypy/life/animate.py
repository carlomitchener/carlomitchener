from mrlypy.two import Cell2d, carpet_2d
import mrlypy.tile
import numpy as np
import time
from typing import List
from .config import Config
from .enums import Boundary, Fate
from .helpers import logger
from .models import Life

def get_next_grid(cell: Cell2d, birth: List[int], survive: List[int], mask: np.ndarray, mode: str = "constant") -> Cell2d:
    cell.neighbors(mask, target=1, mode=mode)
    neighbor_grid = cell.tags
    grid = cell.types
    birth_mask = np.isin(neighbor_grid, birth) & (grid == 0)
    survive_mask = np.isin(neighbor_grid, survive) & (grid == 1)
    next_grid = np.zeros_like(grid)
    next_grid[birth_mask | survive_mask] = 1
    return Cell2d(types=next_grid)

def animate(config: Config, grid: Cell2d = None, mask: Cell2d = None) -> Life:
    # SETUP
    if grid is None:
        tile = mrlypy.tile.create(config.tile)
        tile = mrlypy.tile.build(tile)
        grid = tile.cell
    if mask is None:
        mask = carpet_2d(3)
    current_grid = grid.copy()
    if config.grid_size and config.grid_size > 1:
        current_grid = current_grid.tile(config.grid_size, config.grid_size)
    # PAD
    if config.padding > 0:
        padded_types = np.pad(current_grid.types, pad_width=config.padding, mode='constant', constant_values=0)
        current_grid = Cell2d(types=padded_types)
    # ANIMATE
    grids = [current_grid.copy()]
    history = {current_grid.types.tobytes(): 0}
    fate = None
    loop = 0
    start_time = time.time()
    i = 0
    for i in range(1, config.max_generations):
        next_grid = get_next_grid(current_grid, config.birth_counts, config.survive_counts, mask.types, mode=config.boundary.value)
        if np.array_equal(current_grid.types, next_grid.types):
            fate = Fate.DEAD if np.sum(next_grid.types) == 0 else Fate.LIFE
            break
        grid_bytes = next_grid.types.tobytes()
        if grid_bytes in history:
            loop = i - history[grid_bytes]
            fate = Fate.LOOP
            break
        history[grid_bytes] = i
        current_grid = next_grid
        grids.append(current_grid.copy())
        logger.debug(f"Animated: {i}")
    elapsed = round(time.time() - start_time, 2)
    logger.info(f"Animated {i} generations in {elapsed}s")
    if not fate:
        fate = Fate.TIME
    return Life(grids=grids, fate=fate, count=len(grids), time=elapsed, loop=loop)
