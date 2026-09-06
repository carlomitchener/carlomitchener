import numpy as np
from copy import deepcopy
from typing import List, TYPE_CHECKING
from mrlypy.core.errors import MrlyError

if TYPE_CHECKING:
    from .models import Cell2d

# PUBLIC - IMMUTABLE

def merge_2d(cells: List["Cell2d"], width: int, height: int) -> "Cell2d":
    from .models import Cell2d
    if not cells:
        raise MrlyError("Cannot merge an empty list of cells.")
    if len(cells) != width * height:
        raise MrlyError(f"Expected {width * height} cells, got {len(cells)}")
    first_cell = cells[0]
    cell_width, cell_height = first_cell.width, first_cell.height
    total_width = width * cell_width
    total_height = height * cell_height
    new_cell = Cell2d(width=total_width, height=total_height)
    for i, cell in enumerate(cells):
        if cell.width != cell_width or cell.height != cell_height:
            raise MrlyError("All cells in a merge operation must have the same dimensions.")
        x = i % width
        y = i // width
        start_x = x * cell_width
        end_x = start_x + cell_width
        start_y = y * cell_height
        end_y = start_y + cell_height
        if cell._types is not None:
            new_cell.types[start_y:end_y, start_x:end_x] = cell.types
        if cell._colors is not None:
            new_cell.colors[start_y:end_y, start_x:end_x] = cell.colors
        if cell._tags is not None:
            new_cell.tags[start_y:end_y, start_x:end_x] = cell.tags
    return new_cell

def combine_2d(cell_1: "Cell2d", cell_2: "Cell2d") -> "Cell2d":
    from .models import Cell2d
    new_types = np.kron(cell_1.types, cell_2.types).astype(np.uint8)
    return Cell2d(types=new_types)

def magic_2d(cells: List["Cell2d"]) -> "Cell2d":
    if len(cells) < 2:
        raise MrlyError("Magic composition requires at least two cells.")
    new_cell = combine_2d(cells[0], cells[1])
    for i in range(2, len(cells)):
        new_cell = combine_2d(new_cell, cells[i])
    return new_cell

def special_2d(mask: np.ndarray, cell: "Cell2d") -> "Cell2d":
    height, width = mask.shape
    new_cells = []
    for y in range(height):
        for x in range(width):
            rotation_index = mask[y, x]
            if not (0 <= rotation_index <= 3):
                raise MrlyError(f"Invalid rotation value '{rotation_index}'. Must be 0, 1, 2, or 3.")
            new_cell = cell.copy().rotate(rotation_index)
            new_cells.append(new_cell)
    return merge_2d(new_cells, width, height)

def mosaic_2d(mask: np.ndarray, cells: List["Cell2d"]) -> "Cell2d":
    height, width = mask.shape
    new_cells = []
    for y in range(height):
        for x in range(width):
            cell_index = mask[y, x]
            new_cell = cells[cell_index].copy()
            new_cells.append(new_cell)
    return merge_2d(new_cells, width, height)

# PRIVATE - MUTABLE

def invert_2d(cell: "Cell2d") -> "Cell2d":
    if cell._types is not None:
        cell.types = 1 - cell.types
    return cell

def pad_2d(cell: "Cell2d", count: int = 1, value: int = 0) -> "Cell2d":
    if cell._types is not None:
        cell.types = np.pad(cell.types, count, mode="constant", constant_values=value)
    if cell._colors is not None:
        cell.colors = np.pad(cell.colors, count, mode="constant", constant_values=value)
    if cell._tags is not None:
        cell.tags = np.pad(cell.tags, count, mode="constant", constant_values=value)
    return cell

def rotate_2d(cell: "Cell2d", k: int = 1) -> "Cell2d":
    if k % 4 == 0:
        return cell
    if cell._types is not None:
        cell.types = np.rot90(cell.types, k)
    if cell._colors is not None:
        cell.colors = np.rot90(cell.colors, k, axes=(1, 0))
    if cell._tags is not None:
        cell.tags = np.rot90(cell.tags, k)
    return cell

def fractal_2d(cell: "Cell2d", level: int) -> "Cell2d":
    if level < 1:
        raise MrlyError("Fractal level must be at least 1.")
    if level == 1:
        return cell
    new_types = cell.types
    for _ in range(1, level):
        new_types = np.kron(new_types, cell.types)
    cell.types = new_types.astype(np.uint8)
    cell.colors = None
    cell.tags = None
    return cell

def tile_2d(cell: "Cell2d", width: int, height: int) -> "Cell2d":
    if cell._types is not None:
        cell.types = np.tile(cell.types, (height, width))
    if cell._colors is not None:
        cell.colors = np.tile(cell.colors, (height, width, 1))
    if cell._tags is not None:
        cell.tags = np.tile(cell.tags, (height, width))
    return cell

def layers_2d(cell: "Cell2d", dtype: np.dtype = np.dtype(np.uint8)) -> "Cell2d":
    height, width = cell.height, cell.width
    y_indices, x_indices = np.indices((height, width))
    center_y = (height - 1) / 2
    center_x = (width - 1) / 2
    distance_y = np.floor(np.abs(y_indices - center_y))
    distance_x = np.floor(np.abs(x_indices - center_x))
    tags = np.maximum(distance_x, distance_y)
    cell.tags = tags.astype(dtype)
    return cell

def neighbors_2d(cell: "Cell2d", mask: np.ndarray, target: int = 1, mode: str = "constant", dtype: np.dtype = np.dtype(np.uint8)) -> "Cell2d":
    mask_height, mask_width = mask.shape
    if mask_height % 2 == 0 or mask_width % 2 == 0:
        raise MrlyError("Neighborhood (mask) dimensions must be odd.")
    if target not in [0, 1]:
        raise MrlyError("Bit to count (target) must be 0 or 1.")
    bit = (cell.types == target).astype(dtype)
    if mode not in ["constant", "wrap"]:
        raise MrlyError("Boundary (mode) must be 'constant' or 'wrap'.")
    py = mask_height // 2
    px = mask_width // 2
    pad_bits = np.pad(bit, pad_width=((py, py), (px, px)), mode=mode)
    neighbor_counts = np.zeros_like(cell.types, dtype=dtype)
    for r in range(mask_height):
        for c in range(mask_width):
            if mask[r, c] == 1:
                start_row, end_row = r, r + cell.types.shape[0]
                start_col, end_col = c, c + cell.types.shape[1]
                neighbor_counts += pad_bits[start_row:end_row, start_col:end_col]
    cell.tags = neighbor_counts.astype(dtype)
    return cell
