import numpy as np
from typing import Dict, List, Tuple
from mrlypy.core.errors import MrlyError
from .models import Network

VOID = 0
FILL = 1
GRID = 2

# TRIANGLE GEOMETRY

def _north(x: int, y: int) -> List[Tuple[int, int]]:
    return [(x, 2 * y + 2), (x + 1, 2 * y), (x + 2, 2 * y + 2)]

def _south(x: int, y: int) -> List[Tuple[int, int]]:
    return [(x, 2 * y), (x + 1, 2 * y + 2), (x + 2, 2 * y)]

def _corners(x: int, y: int, start: int) -> List[Tuple[int, int]]:
    north = (x + y + start) % 2 == 0
    return _north(x, y) if north else _south(x, y)

def _edges_of(corners: List[Tuple[int, int]]) -> List[Tuple[Tuple[int, int], Tuple[int, int]]]:
    a, b, c = corners
    return [tuple(sorted((a, b))), tuple(sorted((b, c))), tuple(sorted((a, c)))]

def _centroid(corners: List[Tuple[int, int]]) -> Tuple[float, float]:
    xs = sum(p[0] for p in corners) / 3.0
    ys = sum(p[1] for p in corners) / 3.0
    return (xs, ys)

# HELPERS

def _unwrap(cell):
    inner = cell._cell if hasattr(cell, "_cell") else cell
    start = getattr(cell, "start", 0)
    if not hasattr(inner, "types"):
        raise MrlyError("slice graph expects a Cell6d or a 2D cell with a types array.")
    types = np.asarray(inner.types)
    if types.ndim != 2:
        raise MrlyError("slice graph expects a 2D (triangular) slice.")
    return types, int(start)

def _adjacency_graph(types: np.ndarray, start: int, keep) -> Network:
    height, width = types.shape
    cells = [(x, y) for y in range(height) for x in range(width) if keep(int(types[y, x]))]
    index_of = {cell: i for i, cell in enumerate(cells)}
    network = Network(dim=2)
    for (x, y) in cells:
        network.add_node(_centroid(_corners(x, y, start)))
    edge_to_cells: Dict[Tuple, List[Tuple[int, int]]] = {}
    for (x, y) in cells:
        for edge in _edges_of(_corners(x, y, start)):
            edge_to_cells.setdefault(edge, []).append((x, y))
    for shared in edge_to_cells.values():
        if len(shared) == 2:
            a, b = shared
            network.add_branch(index_of[a], index_of[b])
    return network

# CORE GRAPH - ONE NODE PER FILL TRIANGLE, EDGES JOIN EDGE-ADJACENT FILL TRIANGLES

def slice_core_graph(cell) -> Network:
    types, start = _unwrap(cell)
    return _adjacency_graph(types, start, lambda v: v == FILL)

# TUNNEL GRAPH - SAME ON THE VOID TRIANGLES (THE PORE NETWORK OF THE SLICE)

def slice_tunnel_graph(cell) -> Network:
    types, start = _unwrap(cell)
    return _adjacency_graph(types, start, lambda v: v == VOID)

# EDGE GRAPH - NODES AT TRIANGLE CORNERS, EDGES ALONG TRIANGLE SIDES (THE MESH)

def slice_edge_graph(cell, value: int = FILL) -> Network:
    types, start = _unwrap(cell)
    height, width = types.shape
    if value is None:
        keep = lambda v: v in (FILL, VOID)
    else:
        keep = lambda v: v == value
    corner_index: Dict[Tuple[int, int], int] = {}
    network = Network(dim=2)
    def node(corner: Tuple[int, int]) -> int:
        if corner not in corner_index:
            corner_index[corner] = network.add_node((float(corner[0]), float(corner[1])))
        return corner_index[corner]
    seen = set()
    for y in range(height):
        for x in range(width):
            if not keep(int(types[y, x])):
                continue
            corners = _corners(x, y, start)
            for edge in _edges_of(corners):
                if edge in seen:
                    continue
                seen.add(edge)
                network.add_branch(node(edge[0]), node(edge[1]))
    return network

def slice_dual_graph(cell) -> Network:
    types, start = _unwrap(cell)
    return _adjacency_graph(types, start, lambda v: v in (FILL, VOID))
