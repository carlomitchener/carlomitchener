import numpy as np
from fractions import Fraction
from math import comb, ceil, floor, log
from typing import Callable, Dict, Iterable, Tuple
from .errors import MrlyError
from . import binary

# GRID

def grid_lines(number: int, level: int) -> int:
    return number**level

def grid_squares(number: int, level: int) -> int:
    return (number**2)**level

def grid_cubes(number: int, level: int) -> int:
    return (number**3)**level

# CARPET

def carpet_fill_squares(number: int, level: int) -> int:
    return (number**2-floor(number/2)**2)**level

def carpet_void_squares(number: int, level: int) -> int:
    return grid_squares(number, level) - carpet_fill_squares(number, level)

def carpet_fill_cubes(number: int, level: int) -> int:
    E = ceil(number/2)
    O = floor(number/2)
    return (E**3 + 3*O*E**2)**level

def carpet_void_cubes(number: int, level: int) -> int:
    return grid_cubes(number, level) - carpet_fill_cubes(number, level)

# NET

def net_fill_squares(number: int, level: int) -> int:
    return (number**2-floor((number+1)/2)**2)**level

def net_void_squares(number: int, level: int) -> int:
    return grid_squares(number, level) - net_fill_squares(number, level)

def net_fill_cubes(number: int, level: int) -> int:
    E = ceil(number/2)
    O = floor(number/2)
    return (O**3 + 3*E*O**2)**level

def net_void_cubes(number: int, level: int) -> int:
    return grid_cubes(number, level) - net_fill_cubes(number, level)

# TREE

def tree_fill_squares(number: int, level: int) -> int:
    return (number*floor((number+1)/2))**level

def tree_void_squares(number: int, level: int) -> int:
    return grid_squares(number, level) - tree_fill_squares(number, level)

def tree_fill_cubes(number: int, level: int) -> int:
    return (number * ceil(number/2)**2)**level

def tree_void_cubes(number: int, level: int) -> int:
    return grid_cubes(number, level) - tree_fill_cubes(number, level)

# VOID

def void_fill_squares(number: int, level: int) -> int:
    return (ceil(number**2/2))**level

def void_void_squares(number: int, level: int) -> int:
    return grid_squares(number, level) - void_fill_squares(number, level)

def void_fill_cubes(number: int, level: int) -> int:
    E = ceil(number/2)
    O = floor(number/2)
    return (E**3 + O**3)**level

def void_void_cubes(number: int, level: int) -> int:
    return grid_cubes(number, level) - void_fill_cubes(number, level)

# LEVEL-SET (THE SYMMETRIC GENUS)

def _level_set_base(number: int, dimension: int, levels: Iterable[int]) -> int:
    even = ceil(number / 2)
    odd = floor(number / 2)
    chosen = set(int(j) for j in levels)
    return sum(comb(dimension, j) * (odd ** j) * (even ** (dimension - j))
               for j in chosen if 0 <= j <= dimension)

def level_set_fill(number: int, level: int, dimension: int, levels: Iterable[int]) -> int:
    return _level_set_base(number, dimension, levels) ** level

def level_set_fill_squares(number: int, level: int, levels: Iterable[int]) -> int:
    return level_set_fill(number, level, 2, levels)

def level_set_fill_cubes(number: int, level: int, levels: Iterable[int]) -> int:
    return level_set_fill(number, level, 3, levels)

def level_set_void_squares(number: int, level: int, levels: Iterable[int]) -> int:
    return grid_squares(number, level) - level_set_fill_squares(number, level, levels)

def level_set_void_cubes(number: int, level: int, levels: Iterable[int]) -> int:
    return grid_cubes(number, level) - level_set_fill_cubes(number, level, levels)

# RATIOS

def carpet_ratio_2d(number: int, level: int) -> float:
    return carpet_fill_squares(number, level) / grid_squares(number, level)

def carpet_ratio_3d(number: int, level: int) -> float:
    return carpet_fill_cubes(number, level) / grid_cubes(number, level)

def net_ratio_2d(number: int, level: int) -> float:
    return net_fill_squares(number, level) / grid_squares(number, level)

def net_ratio_3d(number: int, level: int) -> float:
    return net_fill_cubes(number, level) / grid_cubes(number, level)

def tree_ratio_2d(number: int, level: int) -> float:
    return tree_fill_squares(number, level) / grid_squares(number, level)

def tree_ratio_3d(number: int, level: int) -> float:
    return tree_fill_cubes(number, level) / grid_cubes(number, level)

def void_ratio_2d(number: int, level: int) -> float:
    return void_fill_squares(number, level) / grid_squares(number, level)

def void_ratio_3d(number: int, level: int) -> float:
    return void_fill_cubes(number, level) / grid_cubes(number, level)

def carpet_ratio_6d(number: int, level: int) -> float:
    return carpet_fill_triangles(number, level) / grid_triangles(number, level)

def net_ratio_6d(number: int, level: int) -> float:
    return net_fill_triangles(number, level) / grid_triangles(number, level)

def tree_ratio_6d(number: int, level: int) -> float:
    return tree_fill_triangles(number, level) / grid_triangles(number, level)

def void_ratio_6d(number: int, level: int) -> float:
    return void_fill_triangles(number, level) / grid_triangles(number, level)

# DIMENSIONS

def calculate_dimension(design: Callable, number: int, dimension: int) -> float:
    if number == 1:
        return float(dimension)
    grid = design(number)
    fill = np.sum(grid)
    if fill <= 0:
        return 0.0
    return log(fill) / log(number)

def carpet_2d_dimension(number: int) -> float:
    return calculate_dimension(binary.carpet_2d, number, 2)

def carpet_3d_dimension(number: int) -> float:
    return calculate_dimension(binary.carpet_3d, number, 3)

def net_2d_dimension(number: int) -> float:
    return calculate_dimension(binary.net_2d, number, 2)

def net_3d_dimension(number: int) -> float:
    return calculate_dimension(binary.net_3d, number, 3)

def tree_2d_dimension(number: int) -> float:
    return calculate_dimension(binary.tree_2d, number, 2)

def tree_3d_dimension(number: int) -> float:
    return calculate_dimension(binary.tree_3d, number, 3)

def void_2d_dimension(number: int) -> float:
    return calculate_dimension(binary.void_2d, number, 2)

def void_3d_dimension(number: int) -> float:
    return calculate_dimension(binary.void_3d, number, 3)

# TRIANGLES

_fill_diag_cache: Dict[str, np.ndarray] = {}
_total_diag_cache: Dict[int, np.ndarray] = {}

def _fill_by_diag(grid: np.ndarray, n: int) -> np.ndarray:
    max_d = 3 * (n - 1)
    f = np.zeros(max_d + 1, dtype=np.int64)
    for cx in range(n):
        for cy in range(n):
            for cz in range(n):
                if grid[cx, cy, cz]:
                    f[cx + cy + cz] += 1
    return f

def _total_by_diag(n: int) -> np.ndarray:
    if n in _total_diag_cache:
        return _total_diag_cache[n]
    max_d = 3 * (n - 1)
    t = np.zeros(max_d + 1, dtype=np.int64)
    for cx in range(n):
        for cy in range(n):
            for cz in range(n):
                t[cx + cy + cz] += 1
    _total_diag_cache[n] = t
    return t

def _diag_convolve(f_prev: np.ndarray, f_base: np.ndarray, n: int) -> np.ndarray:
    len_prev = len(f_prev)
    len_base = len(f_base)
    max_s = n * (len_prev - 1) + (len_base - 1)
    f_new = np.zeros(max_s + 1, dtype=np.int64)
    for a in range(len_prev):
        if f_prev[a] == 0:
            continue
        for b in range(len_base):
            if f_base[b] == 0:
                continue
            f_new[n * a + b] += f_prev[a] * f_base[b]
    return f_new

def _visited_diags(m: int) -> Tuple[list, list]:
    k = (3 * (4 * m - 1)) // 2
    d = k // 4
    if m % 2 == 0:
        return [d - 1, d], [4, 4]
    return [d - 2, d - 1, d], [1, 6, 1]

def _cut_counts(design_fn: Callable, number: int, level: int) -> Tuple[int, int]:
    key = f"{design_fn.__name__}_{number}"
    if key not in _fill_diag_cache:
        _fill_diag_cache[key] = _fill_by_diag(design_fn(number), number)
    f_base = _fill_diag_cache[key]
    t_base = _total_by_diag(number)
    f_cur = f_base.copy()
    t_cur = t_base.copy()
    for _ in range(1, level):
        f_cur = _diag_convolve(f_cur, f_base, number)
        t_cur = _diag_convolve(t_cur, t_base, number)
    m = number ** level
    diags, weights = _visited_diags(m)
    fill = 0
    total = 0
    for d, w in zip(diags, weights):
        if d < len(f_cur):
            fill += w * int(f_cur[d])
        if d < len(t_cur):
            total += w * int(t_cur[d])
    return int(fill), int(total - fill)

def grid_triangles(number: int, level: int) -> int:
    return 6 * number ** (2 * level)

def carpet_fill_triangles(number: int, level: int) -> int:
    fill, _ = _cut_counts(binary.carpet_3d, number, level)
    return fill

def carpet_void_triangles(number: int, level: int) -> int:
    _, void = _cut_counts(binary.carpet_3d, number, level)
    return void

def net_fill_triangles(number: int, level: int) -> int:
    fill, _ = _cut_counts(binary.net_3d, number, level)
    return fill

def net_void_triangles(number: int, level: int) -> int:
    _, void = _cut_counts(binary.net_3d, number, level)
    return void

def tree_fill_triangles(number: int, level: int) -> int:
    fill, _ = _cut_counts(binary.tree_3d, number, level)
    return fill

def tree_void_triangles(number: int, level: int) -> int:
    _, void = _cut_counts(binary.tree_3d, number, level)
    return void

def void_fill_triangles(number: int, level: int) -> int:
    fill, _ = _cut_counts(binary.void_3d, number, level)
    return fill

def void_void_triangles(number: int, level: int) -> int:
    _, void = _cut_counts(binary.void_3d, number, level)
    return void

# SURFACE AREA

def _visible_faces(occ: np.ndarray) -> int:
    total = 0
    for axis in range(3):
        lo = np.take(np.pad(occ, [(1, 0) if i == axis else (0, 0) for i in range(3)]),
                     range(occ.shape[axis]), axis=axis)
        hi = np.take(np.pad(occ, [(0, 1) if i == axis else (0, 0) for i in range(3)]),
                     range(1, occ.shape[axis] + 1), axis=axis)
        total += int(np.clip(occ - lo, 0, None).sum())
        total += int(np.clip(occ - hi, 0, None).sum())
    return total

def _vh_state(grid: np.ndarray) -> Tuple[int, int]:
    occ = (grid != 0).astype(np.int64)
    vf = _visible_faces(occ)
    return vf, 6 * int(occ.sum()) - vf

def _solve_2x2(a, b, c, d, p, q):
    det = a * d - b * c
    x = Fraction(p * d - b * q, det)
    y = Fraction(a * q - p * c, det)
    return x, y

def _surface_transfer(design_fn: Callable, number: int):
    base = design_fn(number)
    g1 = base
    g2 = np.kron(g1, base).astype(np.uint8)
    g3 = np.kron(g2, base).astype(np.uint8)
    (v0, h0), (v1, h1), (v2, h2) = _vh_state(g1), _vh_state(g2), _vh_state(g3)
    m00, m01 = _solve_2x2(v0, h0, v1, h1, v1, v2)
    m10, m11 = _solve_2x2(v0, h0, v1, h1, h1, h2)
    return ((m00, m01), (m10, m11)), (v0, h0)

def _surface_general(design_fn: Callable, number: int, level: int) -> int:
    grid = design_fn(number)
    s1, h1 = _vh_state(grid)
    if level == 1:
        return s1
    if h1 == 0:
        return s1 * int((grid != 0).sum()) ** (level - 1)
    M, v1 = _surface_transfer(design_fn, number)
    R = [[Fraction(1), Fraction(0)], [Fraction(0), Fraction(1)]]
    for _ in range(level - 1):
        R = [[R[0][0] * M[0][0] + R[0][1] * M[1][0], R[0][0] * M[0][1] + R[0][1] * M[1][1]],
             [R[1][0] * M[0][0] + R[1][1] * M[1][0], R[1][0] * M[0][1] + R[1][1] * M[1][1]]]
    return int(R[0][0] * v1[0] + R[0][1] * v1[1])

def carpet_surface(number: int, level: int) -> int:
    return _surface_general(binary.carpet_3d, number, level)

def net_surface(number: int, level: int) -> int:
    return _surface_general(binary.net_3d, number, level)

def tree_surface(number: int, level: int) -> int:
    return _surface_general(binary.tree_3d, number, level)

def void_surface(number: int, level: int) -> int:
    return _surface_general(binary.void_3d, number, level)

def surface_visible_faces(design_fn: Callable, number: int, level: int) -> int:
    grid = design_fn(number)
    if level > 1:
        base = grid
        for _ in range(1, level):
            grid = np.kron(grid, base).astype(np.uint8)
    occ = (grid != 0).astype(np.int64)
    total = 0
    for axis in range(3):
        lo = np.take(np.pad(occ, [(1, 0) if i == axis else (0, 0) for i in range(3)]),
                     range(occ.shape[axis]), axis=axis)
        hi = np.take(np.pad(occ, [(0, 1) if i == axis else (0, 0) for i in range(3)]),
                     range(1, occ.shape[axis] + 1), axis=axis)
        total += int(np.clip(occ - lo, 0, None).sum())
        total += int(np.clip(occ - hi, 0, None).sum())
    return total

_GRID_FN = {2: grid_squares, 3: grid_cubes}

_FILL_FN = {
    (binary.carpet_2d.__name__, 2): carpet_fill_squares,
    (binary.net_2d.__name__, 2): net_fill_squares,
    (binary.tree_2d.__name__, 2): tree_fill_squares,
    (binary.htree_2d.__name__, 2): tree_fill_squares,
    (binary.vtree_2d.__name__, 2): tree_fill_squares,
    (binary.void_2d.__name__, 2): void_fill_squares,
    (binary.carpet_3d.__name__, 3): carpet_fill_cubes,
    (binary.net_3d.__name__, 3): net_fill_cubes,
    (binary.tree_3d.__name__, 3): tree_fill_cubes,
    (binary.xtree_3d.__name__, 3): tree_fill_cubes,
    (binary.ytree_3d.__name__, 3): tree_fill_cubes,
    (binary.ztree_3d.__name__, 3): tree_fill_cubes,
    (binary.void_3d.__name__, 3): void_fill_cubes,
}

def _shift_occ(occ: np.ndarray, axis: int) -> np.ndarray:
    s = np.zeros_like(occ)
    src = [slice(None)] * occ.ndim
    dst = [slice(None)] * occ.ndim
    src[axis] = slice(1, None)
    dst[axis] = slice(0, -1)
    s[tuple(dst)] = occ[tuple(src)]
    return s

def _core_edges_grid(grid: np.ndarray) -> int:
    occ = (grid != 0)
    total = 0
    for axis in range(occ.ndim):
        total += int((occ & _shift_occ(occ, axis)).sum())
    return total

# CORE GRAPH

def core_nodes(design_fn: Callable, number: int, level: int) -> int:
    dim = design_fn(number).ndim
    fill = _FILL_FN[(design_fn.__name__, dim)](number, level)
    return fill

def core_edges(design_fn: Callable, number: int, level: int) -> int:
    base = design_fn(number)
    e1 = _core_edges_grid(base)
    if e1 == 0:
        return 0
    if level == 1:
        return e1
    g = base
    seq = [e1]
    for _ in range(3):
        g = np.kron(g, base).astype(np.uint8)
        seq.append(_core_edges_grid(g))
    det = seq[1] * seq[1] - seq[0] * seq[2]
    M = [[seq[1], -seq[0]], [seq[2], -seq[1]]]
    rhs = [seq[2], seq[3]]
    d = M[0][0] * M[1][1] - M[0][1] * M[1][0]
    s = Fraction(rhs[0] * M[1][1] - M[0][1] * rhs[1], d)
    p = Fraction(M[0][0] * rhs[1] - rhs[0] * M[1][0], d)
    out = list(seq)
    while len(out) < level:
        out.append(int(s * out[-1] - p * out[-2]))
    return int(out[level - 1])

# TUNNEL GRAPH

def tunnel_nodes(design_fn: Callable, number: int, level: int) -> int:
    dim = design_fn(number).ndim
    grid = _GRID_FN[dim](number, level)
    fill = _FILL_FN[(design_fn.__name__, dim)](number, level)
    return grid - fill

def _tunnel_edges_grid(grid: np.ndarray) -> int:
    inverted = 1 - (grid != 0).astype(np.uint8)
    return _core_edges_grid(inverted)

def tunnel_edges(design_fn: Callable, number: int, level: int) -> int:
    grid = design_fn(number)
    base = grid
    for _ in range(1, level):
        grid = np.kron(grid, base).astype(np.uint8)
    return _tunnel_edges_grid(grid)

def _slice_start(number: int, level: int) -> int:
    return 0

def _slice_triangle(x: int, y: int, start: int):
    north = (x + y + start) % 2 == 0
    if north:
        return [(x, 2 * y + 2), (x + 1, 2 * y), (x + 2, 2 * y + 2)]
    return [(x, 2 * y), (x + 1, 2 * y + 2), (x + 2, 2 * y)]

def _slice_edges_of(corners):
    a, b, c = corners
    return [tuple(sorted((a, b))), tuple(sorted((b, c))), tuple(sorted((a, c)))]

def _slice_cut_types(design_fn: Callable, number: int, level: int):
    from mrlysix.geometry import cut
    from mrlythree.models import Cell3d
    grid = design_fn(number)
    base = grid
    for _ in range(1, level):
        grid = np.kron(grid, base).astype(np.uint8)
    cell6 = cut(Cell3d(types=grid))
    return cell6._cell.types, int(cell6.start)

def _slice_adjacency_counts(types: np.ndarray, start: int, value: int):
    height, width = types.shape
    cells = [(x, y) for y in range(height) for x in range(width) if int(types[y, x]) == value]
    edge_to_cells: Dict[Tuple, list] = {}
    for (x, y) in cells:
        for e in _slice_edges_of(_slice_triangle(x, y, start)):
            edge_to_cells.setdefault(e, []).append((x, y))
    edges = sum(1 for shared in edge_to_cells.values() if len(shared) == 2)
    index = {c: i for i, c in enumerate(cells)}
    adj = {i: [] for i in range(len(cells))}
    for shared in edge_to_cells.values():
        if len(shared) == 2:
            a, b = shared
            adj[index[a]].append(index[b])
            adj[index[b]].append(index[a])
    seen = [False] * len(cells)
    comps = 0
    for s in range(len(cells)):
        if seen[s]:
            continue
        comps += 1
        stack = [s]
        seen[s] = True
        while stack:
            u = stack.pop()
            for v in adj[u]:
                if not seen[v]:
                    seen[v] = True
                    stack.append(v)
    return edges, comps

def slice_core_nodes(design_fn: Callable, number: int, level: int) -> int:
    types, start = _slice_cut_types(design_fn, number, level)
    return int((types == 1).sum())

def slice_tunnel_nodes(design_fn: Callable, number: int, level: int) -> int:
    types, start = _slice_cut_types(design_fn, number, level)
    return int((types == 0).sum())

def slice_core_edges(design_fn: Callable, number: int, level: int) -> int:
    types, start = _slice_cut_types(design_fn, number, level)
    edges, _ = _slice_adjacency_counts(types, start, 1)
    return edges

def slice_tunnel_edges(design_fn: Callable, number: int, level: int) -> int:
    types, start = _slice_cut_types(design_fn, number, level)
    edges, _ = _slice_adjacency_counts(types, start, 0)
    return edges

def slice_core_components(design_fn: Callable, number: int, level: int) -> int:
    types, start = _slice_cut_types(design_fn, number, level)
    _, comps = _slice_adjacency_counts(types, start, 1)
    return comps

def solid_slice_core_edges(number: int) -> int:
    if number % 2 == 0:
        raise MrlyError("solid slice closed form is defined for odd number = 2k-1.")
    k = (number + 1) // 2
    return 36 * k ** 2 - 42 * k + 12

def solid_slice_core_nodes(number: int) -> int:
    if number % 2 == 0:
        raise MrlyError("solid slice closed form is defined for odd number = 2k-1.")
    k = (number + 1) // 2
    return 24 * k ** 2 - 24 * k + 6
