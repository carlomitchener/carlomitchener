import numpy as np
from typing import Dict, TYPE_CHECKING
from .errors import MrlyError

if TYPE_CHECKING:
    from mrlytwo.models import Cell2d
    from mrlythree.models import Cell3d

# 2D PRIMITIVES

def _occ_2d(grid: np.ndarray) -> np.ndarray:
    return (grid != 0)

def cells_2d(grid: np.ndarray) -> int:
    return int(_occ_2d(grid).sum())

def vertices_2d(grid: np.ndarray) -> int:
    occ = _occ_2d(grid)
    h, w = occ.shape
    corners = np.zeros((h + 1, w + 1), dtype=bool)
    corners[:-1, :-1] |= occ
    corners[:-1, 1:] |= occ
    corners[1:, :-1] |= occ
    corners[1:, 1:] |= occ
    return int(corners.sum())

def edges_2d(grid: np.ndarray) -> int:
    occ = _occ_2d(grid)
    h, w = occ.shape
    horiz = np.zeros((h + 1, w), dtype=bool)
    horiz[:-1, :] |= occ
    horiz[1:, :] |= occ
    vert = np.zeros((h, w + 1), dtype=bool)
    vert[:, :-1] |= occ
    vert[:, 1:] |= occ
    return int(horiz.sum() + vert.sum())

def perimeter_2d(grid: np.ndarray) -> int:
    occ = _occ_2d(grid).astype(np.int64)
    h, w = occ.shape
    top = np.pad(occ, ((1, 0), (0, 0)))[:-1]
    bottom = np.pad(occ, ((0, 1), (0, 0)))[1:]
    left = np.pad(occ, ((0, 0), (1, 0)))[:, :-1]
    right = np.pad(occ, ((0, 0), (0, 1)))[:, 1:]
    exposed = (occ - top) + (occ - bottom) + (occ - left) + (occ - right)
    return int(np.clip(exposed, 0, None)[occ.astype(bool)].sum())

def faces_2d(grid: np.ndarray) -> int:
    return cells_2d(grid)

def euler_2d(grid: np.ndarray) -> int:
    return vertices_2d(grid) - edges_2d(grid) + faces_2d(grid)

def census_2d(grid: np.ndarray) -> Dict[str, int]:
    return {
        "cells": cells_2d(grid),
        "vertices": vertices_2d(grid),
        "edges": edges_2d(grid),
        "perimeter": perimeter_2d(grid),
        "faces": faces_2d(grid),
        "euler": euler_2d(grid),
    }

# 3D PRIMITIVES

def _occ_3d(grid: np.ndarray) -> np.ndarray:
    return (grid != 0)

def cells_3d(grid: np.ndarray) -> int:
    return int(_occ_3d(grid).sum())

def vertices_3d(grid: np.ndarray) -> int:
    occ = _occ_3d(grid)
    d, h, w = occ.shape
    corners = np.zeros((d + 1, h + 1, w + 1), dtype=bool)
    for dz in (0, 1):
        for dy in (0, 1):
            for dx in (0, 1):
                corners[dz:dz + d, dy:dy + h, dx:dx + w] |= occ
    return int(corners.sum())

def edges_3d(grid: np.ndarray) -> int:
    occ = _occ_3d(grid)
    d, h, w = occ.shape
    ex = np.zeros((d + 1, h + 1, w), dtype=bool)
    for dz in (0, 1):
        for dy in (0, 1):
            ex[dz:dz + d, dy:dy + h, :] |= occ
    ey = np.zeros((d + 1, h, w + 1), dtype=bool)
    for dz in (0, 1):
        for dx in (0, 1):
            ey[dz:dz + d, :, dx:dx + w] |= occ
    ez = np.zeros((d, h + 1, w + 1), dtype=bool)
    for dy in (0, 1):
        for dx in (0, 1):
            ez[:, dy:dy + h, dx:dx + w] |= occ
    return int(ex.sum() + ey.sum() + ez.sum())

def faces_3d(grid: np.ndarray) -> int:
    occ = _occ_3d(grid)
    d, h, w = occ.shape
    fz = np.zeros((d + 1, h, w), dtype=bool)
    fz[:-1] |= occ
    fz[1:] |= occ
    fy = np.zeros((d, h + 1, w), dtype=bool)
    fy[:, :-1] |= occ
    fy[:, 1:] |= occ
    fx = np.zeros((d, h, w + 1), dtype=bool)
    fx[:, :, :-1] |= occ
    fx[:, :, 1:] |= occ
    return int(fz.sum() + fy.sum() + fx.sum())

def surface_3d(grid: np.ndarray) -> int:
    occ = _occ_3d(grid).astype(np.int64)
    total = 0
    for axis in (0, 1, 2):
        a = np.pad(occ, [(1, 0) if i == axis else (0, 0) for i in range(3)])
        a = np.take(a, range(occ.shape[axis]), axis=axis)
        b = np.pad(occ, [(0, 1) if i == axis else (0, 0) for i in range(3)])
        b = np.take(b, range(1, occ.shape[axis] + 1), axis=axis)
        total += int(np.clip(occ - a, 0, None).sum())
        total += int(np.clip(occ - b, 0, None).sum())
    return total

def euler_3d(grid: np.ndarray) -> int:
    return vertices_3d(grid) - edges_3d(grid) + faces_3d(grid) - cells_3d(grid)

def census_3d(grid: np.ndarray) -> Dict[str, int]:
    return {
        "cells": cells_3d(grid),
        "vertices": vertices_3d(grid),
        "edges": edges_3d(grid),
        "faces": faces_3d(grid),
        "surface": surface_3d(grid),
        "euler": euler_3d(grid),
    }

# PUBLIC

def census(cell) -> Dict[str, int]:
    grid = getattr(cell, "_cell", cell)
    if hasattr(grid, "depth"):
        return census_3d(grid.types)
    if hasattr(grid, "height"):
        return census_2d(grid.types)
    arr = np.asarray(cell)
    if arr.ndim == 3:
        return census_3d(arr)
    if arr.ndim == 2:
        return census_2d(arr)
    raise MrlyError("census expects a Cell2d, Cell3d, or 2D/3D array.")
