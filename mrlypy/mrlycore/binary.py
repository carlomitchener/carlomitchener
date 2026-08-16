import numpy as np
from typing import List
from .errors import MrlyError
from . import rules

# ZEROS

def zeros_2d(n: int) -> np.ndarray:
    return np.zeros((n, n), dtype=np.uint8)

def zeros_3d(n: int) -> np.ndarray:
    return np.zeros((n, n, n), dtype=np.uint8)

# ONES

def ones_2d(n: int) -> np.ndarray:
    return np.ones((n, n), dtype=np.uint8)

def ones_3d(n: int) -> np.ndarray:
    return np.ones((n, n, n), dtype=np.uint8)

# NOISE

def noise_2d(n: int, density: float = 0.5, rng=None) -> np.ndarray:
    if rng is None:
        rng = np.random
    return (rng.random((n, n)) < density).astype(np.uint8)

def noise_3d(n: int, density: float = 0.5, rng=None) -> np.ndarray:
    if rng is None:
        rng = np.random
    return (rng.random((n, n, n)) < density).astype(np.uint8)

# CARPET

def carpet_2d(n: int) -> np.ndarray:
    return rules.carpet(n, 2)

def carpet_3d(n: int) -> np.ndarray:
    return rules.carpet(n, 3)

# NET

def net_2d(n: int) -> np.ndarray:
    return rules.net(n, 2)

def net_3d(n: int) -> np.ndarray:
    return rules.net(n, 3)

# TREE

def tree_2d(n: int) -> np.ndarray:
    return rules.tree(n, 2, free_axis=0)

def tree_3d(n: int) -> np.ndarray:
    return rules.tree(n, 3, free_axis=2)

def htree_2d(n: int) -> np.ndarray:
    return rules.tree(n, 2, free_axis=1)

def vtree_2d(n: int) -> np.ndarray:
    return rules.tree(n, 2, free_axis=0)

def xtree_3d(n: int) -> np.ndarray:
    return rules.tree(n, 3, free_axis=0)

def ytree_3d(n: int) -> np.ndarray:
    return rules.tree(n, 3, free_axis=1)

def ztree_3d(n: int) -> np.ndarray:
    return rules.tree(n, 3, free_axis=2)

# VOID

def void_2d(n: int) -> np.ndarray:
    return rules.void(n, 2)

def void_3d(n: int) -> np.ndarray:
    return rules.void(n, 3)

# GEOMETRY

def invert(grid: np.ndarray) -> np.ndarray:
    return 1 - grid

def rotate(grid: np.ndarray, k: int = 1) -> np.ndarray:
    k = k % 4
    if k == 0:
        return grid
    return np.rot90(grid, k=k)

def combine(grid_1: np.ndarray, grid_2: np.ndarray) -> np.ndarray:
    return np.kron(grid_1, grid_2).astype(np.uint8)

def magic(grids: List[np.ndarray]) -> np.ndarray:
    if not grids:
        return np.array([[]], dtype=np.uint8)
    result: np.ndarray = grids[0]
    for i in range(1, len(grids)):
        result = combine(result, grids[i])
    return result

def fractal(grid: np.ndarray, level: int) -> np.ndarray:
    if level == 1:
        return grid
    result = grid
    for _ in range(1, level):
        result = np.kron(result, grid)
    return result.astype(np.uint8)
