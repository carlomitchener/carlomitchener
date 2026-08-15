import numpy as np
from typing import Tuple
from mrlycore.errors import MrlyError
from .models import Network

# CORE GRAPH - ONE NODE PER OCCUPIED CELL, EDGES JOIN FACE-ADJACENT CELLS

def core_graph(cell) -> Network:
    grid = _grid(cell)
    occ = (grid != 0)
    dim = occ.ndim
    if dim not in (2, 3):
        raise MrlyError("core_graph expects a 2D or 3D cell.")
    coords = np.argwhere(occ)
    index_of = -np.ones(occ.shape, dtype=np.int64)
    for i, coord in enumerate(coords):
        index_of[tuple(coord)] = i
    network = Network(dim=dim)
    for coord in coords:
        network.add_node(_center(coord))
    for axis in range(dim):
        shifted = _shift(occ, axis)
        both = occ & shifted
        for coord in np.argwhere(both):
            here = index_of[tuple(coord)]
            neighbor_coord = coord.copy()
            neighbor_coord[axis] += 1
            there = index_of[tuple(neighbor_coord)]
            network.add_branch(int(here), int(there))
    return network

# EDGE GRAPH - NODES AT CELL CORNERS, EDGES ALONG CELL BOUNDARIES

def edge_graph(cell) -> Network:
    grid = _grid(cell)
    occ = (grid != 0)
    dim = occ.ndim
    if dim not in (2, 3):
        raise MrlyError("edge_graph expects a 2D or 3D cell.")
    corner_shape = tuple(s + 1 for s in occ.shape)
    corner_used = np.zeros(corner_shape, dtype=bool)
    for offset in _corner_offsets(dim):
        slices = tuple(slice(o, o + s) for o, s in zip(offset, occ.shape))
        corner_used[slices] |= occ
    corner_index = -np.ones(corner_shape, dtype=np.int64)
    network = Network(dim=dim)
    for coord in np.argwhere(corner_used):
        corner_index[tuple(coord)] = network.add_node(tuple(float(c) for c in coord[::-1]))
    seen = set()
    for cell_coord in np.argwhere(occ):
        for a, b in _cell_edges(cell_coord, dim):
            ia = corner_index[a]
            ib = corner_index[b]
            key = (min(ia, ib), max(ia, ib))
            if key in seen:
                continue
            seen.add(key)
            network.add_branch(int(ia), int(ib))
    return network

# TUNNEL GRAPH - CORE GRAPH OF THE INVERTED (VOID) CELL

def tunnel_graph(cell) -> Network:
    grid = _grid(cell)
    inverted = 1 - (grid != 0).astype(np.uint8)
    return core_graph(inverted)

# HELPERS

def _grid(cell) -> np.ndarray:
    if hasattr(cell, "types"):
        return np.asarray(cell.types)
    return np.asarray(cell)

def _center(coord: np.ndarray) -> Tuple[float, ...]:
    return tuple(float(c) + 0.5 for c in coord[::-1])

def _shift(occ: np.ndarray, axis: int) -> np.ndarray:
    shifted = np.zeros_like(occ)
    src = [slice(None)] * occ.ndim
    dst = [slice(None)] * occ.ndim
    src[axis] = slice(1, None)
    dst[axis] = slice(0, -1)
    shifted[tuple(dst)] = occ[tuple(src)]
    return shifted

def _corner_offsets(dim: int):
    if dim == 2:
        return [(dy, dx) for dy in (0, 1) for dx in (0, 1)]
    return [(dz, dy, dx) for dz in (0, 1) for dy in (0, 1) for dx in (0, 1)]

def _cell_edges(coord: np.ndarray, dim: int):
    if dim == 2:
        y, x = int(coord[0]), int(coord[1])
        corners = {
            (0, 0): (y, x), (0, 1): (y, x + 1),
            (1, 0): (y + 1, x), (1, 1): (y + 1, x + 1),
        }
        pairs = [((0, 0), (0, 1)), ((0, 1), (1, 1)), ((1, 1), (1, 0)), ((1, 0), (0, 0))]
        return [(corners[a], corners[b]) for a, b in pairs]
    z, y, x = int(coord[0]), int(coord[1]), int(coord[2])
    def corner(dz, dy, dx):
        return (z + dz, y + dy, x + dx)
    verts = {(dz, dy, dx): corner(dz, dy, dx) for dz in (0, 1) for dy in (0, 1) for dx in (0, 1)}
    pairs = []
    for fixed_axis in range(3):
        for a in ((0, 0), (0, 1), (1, 0), (1, 1)):
            key_lo = list(a)
            key_lo.insert(fixed_axis, 0)
            key_hi = list(a)
            key_hi.insert(fixed_axis, 1)
            pairs.append((tuple(key_lo), tuple(key_hi)))
    return [(verts[a], verts[b]) for a, b in pairs]
