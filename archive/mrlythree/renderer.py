import numpy as np
from typing import Dict, List, Optional, TextIO, Tuple, TYPE_CHECKING

if TYPE_CHECKING:
    from .models import Cell3d

# TEXT

def text_3d(grid: np.ndarray, mapping: Optional[Dict[int, str]] = None) -> List[str]:
    rows = []
    depth, height, width = grid.shape
    for z in range(depth):
        for y in range(height):
            row_str = ""
            for x in range(width):
                val = grid[z, y, x]
                if mapping:
                    row_str += mapping.get(val, str(val))
                else:
                    row_str += str(val)
            rows.append(row_str)
    return rows

# OBJ

def to_obj(cell: "Cell3d", fp: TextIO) -> None:
    grid = cell.types
    vertices: List[Tuple[int, int, int]] = []
    faces: List[Tuple[int, int, int, int]] = []
    vertex_map: Dict[Tuple[int, int, int], int] = {}
    def add_vertex(v_coords: Tuple[int, int, int]) -> int:
        if v_coords not in vertex_map:
            vertex_map[v_coords] = len(vertices) + 1
            vertices.append(v_coords)
        return vertex_map[v_coords]
    dim_x, dim_y, dim_z = grid.shape
    for i in range(dim_x):
        for j in range(dim_y):
            for k in range(dim_z):
                if grid[i, j, k] == 0:
                    continue
                if i == 0 or grid[i - 1, j, k] == 0:
                    v1 = add_vertex((i, j, k))
                    v2 = add_vertex((i, j, k + 1))
                    v3 = add_vertex((i, j + 1, k + 1))
                    v4 = add_vertex((i, j + 1, k))
                    faces.append((v1, v2, v3, v4))
                if i == dim_x - 1 or grid[i + 1, j, k] == 0:
                    v1 = add_vertex((i + 1, j, k))
                    v2 = add_vertex((i + 1, j + 1, k))
                    v3 = add_vertex((i + 1, j + 1, k + 1))
                    v4 = add_vertex((i + 1, j, k + 1))
                    faces.append((v1, v2, v3, v4))
                if j == 0 or grid[i, j - 1, k] == 0:
                    v1 = add_vertex((i, j, k))
                    v2 = add_vertex((i + 1, j, k))
                    v3 = add_vertex((i + 1, j, k + 1))
                    v4 = add_vertex((i, j, k + 1))
                    faces.append((v1, v2, v3, v4))
                if j == dim_y - 1 or grid[i, j + 1, k] == 0:
                    v1 = add_vertex((i, j + 1, k))
                    v2 = add_vertex((i, j + 1, k + 1))
                    v3 = add_vertex((i + 1, j + 1, k + 1))
                    v4 = add_vertex((i + 1, j + 1, k))
                    faces.append((v1, v2, v3, v4))
                if k == 0 or grid[i, j, k - 1] == 0:
                    v1 = add_vertex((i, j, k))
                    v2 = add_vertex((i, j + 1, k))
                    v3 = add_vertex((i + 1, j + 1, k))
                    v4 = add_vertex((i + 1, j, k))
                    faces.append((v1, v2, v3, v4))
                if k == dim_z - 1 or grid[i, j, k + 1] == 0:
                    v1 = add_vertex((i, j, k + 1))
                    v2 = add_vertex((i + 1, j, k + 1))
                    v3 = add_vertex((i + 1, j + 1, k + 1))
                    v4 = add_vertex((i, j + 1, k + 1))
                    faces.append((v1, v2, v3, v4))
    for v in vertices:
        fp.write(f"v {v[0]} {v[1]} {v[2]}\n")
    for f in faces:
        fp.write(f"f {f[0]} {f[1]} {f[2]} {f[3]}\n")
