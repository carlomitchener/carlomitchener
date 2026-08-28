import numpy as np
from enum import Enum
from typing import List, Optional, Tuple
from mrlypy.core.errors import MrlyError
from mrlypy.two.models import Cell2d
from mrlypy.three.models import Cell3d

class Orientation(Enum):
    HORIZONTAL = "horizontal"
    VERTICAL = "vertical"

# CONSTANTS

VOID = 0
FILL = 1
GRID = 2
UP = 3
LEFT = 4
RIGHT = 5

# HELPERS

def is_cube(cell: Cell3d) -> bool:
    return cell.width == cell.height == cell.depth

def is_hex(cell) -> bool:
    h, w = cell.height, cell.width
    if w > h:
        if w % 2 == 0:
            return False
        dx = (3 * (w + 1)) // 4
        row_shift = h // 2
        if (dx + row_shift) % 2 != 0:
            return False
        return True
    elif h > w:
        dy = (3 * (h + 1)) // 4
        row_shift = w // 2
        if (dy + row_shift) % 2 != 0:
            return False
        return True
    return False

def get_orientation(width, height) -> Orientation:
    if width > height:
        return Orientation.HORIZONTAL
    if height > width:
        return Orientation.VERTICAL
    raise MrlyError("Cell must be a hexagon.")

def check_orientation(orientation) -> Orientation:
    if isinstance(orientation, Orientation):
        return orientation
    if orientation not in [Orientation.HORIZONTAL.value, Orientation.VERTICAL.value]:
        raise MrlyError("Unknown orientation.")
    return Orientation(orientation)

def blank(radius: int, orientation: str, fill: int = 1, void: int = 0) -> Cell2d:
    orientation = check_orientation(orientation)
    n = radius
    match orientation:
        case Orientation.HORIZONTAL:
            height = 2 * n
            width = 4 * n - 1
            types = np.full((height, width), fill, dtype=np.uint8)
            for r in range(height):
                p = max(0, n - 1 - r, r - n)
                if p > 0:
                    types[r, :p] = void
                    types[r, width-p:] = void
        case Orientation.VERTICAL:
            width = 2 * n
            height = (7 * n - 1) // 2
            row_shift = width // 2
            while ((3 * (height + 1)) // 4 + row_shift) % 2 != 0:
                height += 1
            types = np.full((height, width), fill, dtype=np.uint8)
            for r in range(height):
                p = max(0, n - 1 - r, r - (height - n))
                if p > 0:
                    types[r, :p] = void
                    types[r, width-p:] = void
    return Cell2d(types=types)

def pad(cell, k: int = 1, val: int = 0):
    if k < 1:
        return cell
    inner = cell._cell if hasattr(cell, '_cell') else cell
    if not is_hex(inner):
        raise MrlyError("Cell must be a hexagon.")
    orientation = get_orientation(inner.width, inner.height)
    match orientation:
        case Orientation.HORIZONTAL:
            n = inner.height // 2
        case Orientation.VERTICAL:
            n = inner.width // 2
    n_new = n + k
    base = blank(n_new, orientation, fill=val, void=GRID)
    y_off = (base.height - inner.height) // 2
    x_off = (base.width - inner.width) // 2
    src_types = inner.types.copy()
    src_types[src_types == GRID] = val
    h_paste = min(inner.height, base.height - y_off)
    w_paste = min(inner.width, base.width - x_off)
    base.types[y_off:y_off+h_paste, x_off:x_off+w_paste] = src_types[:h_paste, :w_paste]
    if inner._colors is not None:
        base.colors = np.zeros((base.height, base.width, 4), dtype=np.uint8)
        base.colors[y_off:y_off+h_paste, x_off:x_off+w_paste] = inner.colors[:h_paste, :w_paste]
    if inner._tags is not None:
        base.tags = np.full((base.height, base.width), val, dtype=np.uint8)
        base.tags[y_off:y_off+h_paste, x_off:x_off+w_paste] = inner.tags[:h_paste, :w_paste]
    return base

# GEOMETRY

def iso(cell: Cell3d):
    from .models import Cell6d
    if not is_cube(cell):
        raise MrlyError("Cell must be a cube.")
    grid = cell.types
    n_x, n_y, n_z = grid.shape
    N = n_x
    width = 2 * N
    height = 4 * N - 1
    types = np.full((height, width), GRID, dtype=np.uint8)
    for z in range(n_z):
        for y in range(n_y):
            for x in range(n_x):
                if grid[x, y, z]:
                    gx = x - y + (N - 1)
                    gy = x + y - 2 * z + (2 * N - 2)
                    if 0 <= gx < width - 1 and 0 <= gy < height - 2:
                        types[gy, gx] = UP
                        types[gy, gx + 1] = UP
                        types[gy + 1, gx] = LEFT
                        types[gy + 1, gx + 1] = RIGHT
                        types[gy + 2, gx] = LEFT
                        types[gy + 2, gx + 1] = RIGHT
    return Cell6d(cell=Cell2d(types=types), projection="iso", orientation="vertical", start=1)

def pro(cell: Cell3d):
    from .models import Cell6d
    if not is_cube(cell):
        raise MrlyError("Cell must be a cube.")
    grid = cell.types
    n_x, n_y, n_z = grid.shape
    N = n_x
    width = 2 * N
    height = 4 * N - 1
    types = np.full((height, width), GRID, dtype=np.uint8)
    y = n_y - 1
    for z in range(n_z):
        for x in range(n_x):
            val = grid[x, y, z]
            gx = x - y + (N - 1)
            gy = x + y - 2 * z + (2 * N - 2)
            draw_val = FILL if val == 1 else VOID
            if 0 <= gx < width - 1 and 0 <= gy < height - 2:
                types[gy+1, gx] = draw_val
                types[gy+2, gx] = draw_val
    x = n_x - 1
    for z in range(n_z):
        for y in range(n_y):
            val = grid[x, y, z]
            gx = x - y + (N - 1)
            gy = x + y - 2 * z + (2 * N - 2)
            draw_val = FILL if val == 1 else VOID
            if 0 <= gx < width - 1 and 0 <= gy < height - 2:
                types[gy+1, gx+1] = draw_val
                types[gy+2, gx+1] = draw_val
    z = n_z - 1
    for y in range(n_y):
        for x in range(n_x):
            val = grid[x, y, z]
            gx = x - y + (N - 1)
            gy = x + y - 2 * z + (2 * N - 2)
            draw_val = FILL if val == 1 else VOID
            if 0 <= gx < width - 1 and 0 <= gy < height - 2:
                types[gy, gx] = draw_val
                types[gy, gx+1] = draw_val
    return Cell6d(cell=Cell2d(types=types), projection="pro", orientation="vertical", start=1)

def cut(cell: Cell3d):
    from .models import Cell6d
    if not is_cube(cell):
        raise MrlyError("Cell must be a cube.")
    scale = 4
    grid = cell.types
    block = np.ones((scale, scale, scale), dtype=np.uint8)
    grid = np.kron(grid, block).astype(np.uint8)
    size = grid.shape[0]
    k = (3 * (size - 1)) // 2
    rows = []
    for z in range(0, size, 2):
        target = k - z
        min_x = max(0, target - (size - 1))
        max_x = min(size - 1, target)
        if min_x > max_x:
            continue
        row_bits = []
        for x in range(min_x, max_x + 1):
            y = target - x
            val = grid[x, y, z]
            row_bits.append(str(val))
        rows.append("".join(row_bits))
    if not rows:
        return Cell6d(cell=Cell2d(width=1, height=1), projection="cut", orientation="horizontal", start=0)
    width = max(len(row) for row in rows)
    height = len(rows)
    types = np.full((height, width), GRID, dtype=np.uint8)
    for r, row in enumerate(rows):
        padding_total = width - len(row)
        offset = padding_total // 2
        for c, char in enumerate(row):
            if char == '1':
                types[r, c + offset] = FILL
            elif char == '0':
                types[r, c + offset] = VOID
    return Cell6d(cell=Cell2d(types=types), projection="cut", orientation="horizontal", start=0)

# TILING

def tessellate(cell, mask: np.ndarray):
    inner = cell._cell if hasattr(cell, '_cell') else cell
    if not is_hex(inner):
        raise MrlyError("Cell must be a hexagon.")
    orientation = get_orientation(inner.width, inner.height)
    tile_h, tile_w = inner.height, inner.width
    match orientation:
        case Orientation.HORIZONTAL:
            dx = (3 * (tile_w + 1)) // 4
            dy = tile_h
            row_shift = tile_h // 2
        case Orientation.VERTICAL:
            dx = tile_w
            dy = (3 * (tile_h + 1)) // 4
            row_shift = tile_w // 2
    positions = []
    rows, cols = np.nonzero(mask)
    if len(rows) == 0:
        return Cell2d(width=1, height=1)
    for r, c in zip(rows, cols):
        match orientation:
            case Orientation.HORIZONTAL:
                pos_x = c * dx
                pos_y = r * dy
                if c % 2 != 0:
                    pos_y += row_shift
            case Orientation.VERTICAL:
                pos_x = c * dx
                pos_y = r * dy
                if r % 2 != 0:
                    pos_x += row_shift
        positions.append((pos_x, pos_y))
    min_x = min(p[0] for p in positions)
    min_y = min(p[1] for p in positions)
    max_x = max(p[0] + tile_w for p in positions)
    max_y = max(p[1] + tile_h for p in positions)
    final_w = max_x - min_x
    final_h = max_y - min_y
    bg_val = GRID
    new_types = np.full((final_h, final_w), bg_val, dtype=np.uint8)
    new_colors = None
    if inner._colors is not None:
        new_colors = np.zeros((final_h, final_w, 4), dtype=np.uint8)
    new_tags = None
    if inner._tags is not None:
        new_tags = np.zeros((final_h, final_w), dtype=np.uint8)
    for (r, c), (px, py) in zip(zip(rows, cols), positions):
        dest_x = px - min_x
        dest_y = py - min_y
        src_types = inner.types
        target_slice_types = new_types[dest_y:dest_y+tile_h, dest_x:dest_x+tile_w]
        mask_paste = (src_types != bg_val)
        target_slice_types[mask_paste] = src_types[mask_paste]
        if new_colors is not None:
            src_colors = inner.colors
            target_slice_colors = new_colors[dest_y:dest_y+tile_h, dest_x:dest_x+tile_w]
            target_slice_colors[mask_paste] = src_colors[mask_paste]
        if new_tags is not None:
            src_tags = inner.tags
            target_slice_tags = new_tags[dest_y:dest_y+tile_h, dest_x:dest_x+tile_w]
            target_slice_tags[mask_paste] = src_tags[mask_paste]
    return Cell2d(types=new_types, colors=new_colors, tags=new_tags)

# TILE

def get_tile_mask(width: int, height: int) -> np.ndarray:
    return np.ones((height, width), dtype=np.uint8)

def tile(cell, width: int, height: int):
    mask = get_tile_mask(width, height)
    return tessellate(cell, mask)

def tile_crop(cell, size: Tuple[int, int]):
    inner = cell._cell if hasattr(cell, '_cell') else cell
    w, h = size
    orientation = get_orientation(w, h)
    match orientation:
        case Orientation.HORIZONTAL:
            crop_x = (w - 1) // 4
            crop_y = h // 2
        case Orientation.VERTICAL:
            crop_x = w // 2
            crop_y = (h - 1) // 4
    current_h, current_w = inner.types.shape
    start_y = crop_y
    end_y = current_h - crop_y
    start_x = crop_x
    end_x = current_w - crop_x
    if start_y >= end_y or start_x >= end_x:
        return Cell2d(types=np.zeros((1, 1), dtype=np.uint8))
    new_types = inner.types[start_y:end_y, start_x:end_x]
    new_colors = None
    if inner._colors is not None:
        new_colors = inner.colors[start_y:end_y, start_x:end_x]
    new_tags = None
    if inner._tags is not None:
        new_tags = inner.tags[start_y:end_y, start_x:end_x]
    return Cell2d(types=new_types, colors=new_colors, tags=new_tags)

# RADIAL

def get_radial_mask(radius: int, orientation: str) -> np.ndarray:
    if radius < 1:
        return np.zeros((1, 1), dtype=np.uint8)
    orientation = check_orientation(orientation)
    size = 2 * radius - 1
    center = radius - 1
    mask = np.zeros((size, size), dtype=np.uint8)
    match orientation:
        case Orientation.HORIZONTAL:
            c_q = center
            c_r = center - (center - (center & 1)) // 2
        case Orientation.VERTICAL:
            c_q = center - (center - (center & 1)) // 2
            c_r = center
    for r in range(size):
        for c in range(size):
            match orientation:
                case Orientation.HORIZONTAL:
                    q = c
                    r_axial = r - (c - (c & 1)) // 2
                case Orientation.VERTICAL:
                    q = c - (r - (r & 1)) // 2
                    r_axial = r
            dq = q - c_q
            dr = r_axial - c_r
            if (abs(dq) + abs(dr) + abs(dq + dr)) / 2 < radius:
                mask[r, c] = 1
    return mask

def radial(cell, radius: int):
    inner = cell._cell if hasattr(cell, '_cell') else cell
    if not is_hex(inner):
        raise MrlyError("Cell must be a hexagon.")
    orientation = get_orientation(inner.width, inner.height)
    mask = get_radial_mask(radius, orientation)
    return tessellate(cell, mask)

def radial_crop(cell, radius: int, size: Tuple[int, int]):
    inner = cell._cell if hasattr(cell, '_cell') else cell
    w, h = size
    orientation = get_orientation(w, h)
    match orientation:
        case Orientation.HORIZONTAL:
            row_shift = h // 2
            crop_x = row_shift
            crop_y = (radius - 1) * row_shift
        case Orientation.VERTICAL:
            row_shift = w // 2
            crop_y = row_shift
            crop_x = (radius - 1) * row_shift
    current_h, current_w = inner.types.shape
    start_y = crop_y
    end_y = current_h - crop_y
    start_x = crop_x
    end_x = current_w - crop_x
    if start_y >= end_y or start_x >= end_x:
        return Cell2d(types=np.zeros((1, 1), dtype=np.uint8))
    new_types = inner.types[start_y:end_y, start_x:end_x]
    new_colors = None
    if inner._colors is not None:
        new_colors = inner.colors[start_y:end_y, start_x:end_x]
    new_tags = None
    if inner._tags is not None:
        new_tags = inner.tags[start_y:end_y, start_x:end_x]
    return Cell2d(types=new_types, colors=new_colors, tags=new_tags)
