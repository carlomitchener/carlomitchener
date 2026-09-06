from typing import Dict, List, Tuple
from mrlypy.core.errors import MrlyError
from . import VOID, FILL, GRID

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

# CENSUS

def _present(value: int, include_grid: bool) -> bool:
    if value == FILL:
        return True
    if value == VOID:
        return True
    if value == GRID:
        return include_grid
    return True

def census_triangles(cell, start: int = None, include_grid: bool = False) -> Dict[str, int]:
    inner = cell._cell if hasattr(cell, "_cell") else cell
    if start is None:
        start = getattr(cell, "start", 0)
    types = inner.types
    height, width = types.shape
    fills = voids = grids = 0
    vertices = set()
    edge_count: Dict[Tuple, int] = {}
    for y in range(height):
        for x in range(width):
            v = int(types[y, x])
            if v == GRID and not include_grid:
                grids += 1
                continue
            if v == FILL:
                fills += 1
            elif v == VOID:
                voids += 1
            elif v == GRID:
                grids += 1
            corners = _corners(x, y, start)
            for c in corners:
                vertices.add(c)
            for e in _edges_of(corners):
                edge_count[e] = edge_count.get(e, 0) + 1
    triangles = fills + voids + (grids if include_grid else 0)
    edges = len(edge_count)
    boundary = sum(1 for n in edge_count.values() if n == 1)
    interior = edges - boundary
    euler = len(vertices) - edges + triangles
    return {
        "triangles": triangles,
        "fills": fills,
        "voids": voids,
        "grids": grids,
        "vertices": len(vertices),
        "edges": edges,
        "boundary_edges": boundary,
        "interior_edges": interior,
        "euler": euler,
    }

def fills_only(cell, start: int = None) -> Dict[str, int]:
    inner = cell._cell if hasattr(cell, "_cell") else cell
    if start is None:
        start = getattr(cell, "start", 0)
    types = inner.types
    height, width = types.shape
    count = 0
    vertices = set()
    edge_count: Dict[Tuple, int] = {}
    for y in range(height):
        for x in range(width):
            if int(types[y, x]) != FILL:
                continue
            count += 1
            corners = _corners(x, y, start)
            for c in corners:
                vertices.add(c)
            for e in _edges_of(corners):
                edge_count[e] = edge_count.get(e, 0) + 1
    edges = len(edge_count)
    boundary = sum(1 for n in edge_count.values() if n == 1)
    return {
        "triangles": count,
        "vertices": len(vertices),
        "edges": edges,
        "boundary_edges": boundary,
        "interior_edges": edges - boundary,
        "euler": len(vertices) - edges + count,
    }
