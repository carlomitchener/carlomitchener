import numpy as np
from copy import deepcopy
from typing import List, Tuple, TYPE_CHECKING
from mrlypy.core.errors import MrlyError

if TYPE_CHECKING:
    from .models import Cell3d

# PUBLIC - IMMUTABLE

def merge_3d(cells: List["Cell3d"], width: int, height: int, depth: int) -> "Cell3d":
    from .models import Cell3d
    if not cells:
        raise MrlyError("Cannot merge an empty list of cells.")
    if len(cells) != width * height * depth:
        raise MrlyError(f"len(cells) != width * height * depth: {len(cells)} != {width} * {height} * {depth}")
    first_cell = cells[0]
    cell_width, cell_height, cell_depth = first_cell.width, first_cell.height, first_cell.depth
    total_width = width * cell_width
    total_height = height * cell_height
    total_depth = depth * cell_depth
    new_cell = Cell3d(width=total_width, height=total_height, depth=total_depth)
    for i, cell in enumerate(cells):
        if cell.width != cell_width or cell.height != cell_height or cell.depth != cell_depth:
            raise MrlyError("All cells in a merge operation must have the same dimensions.")
        x = i % width
        y = (i // width) % height
        z = i // (width * height)
        start_x = x * cell_width
        end_x = start_x + cell_width
        start_y = y * cell_height
        end_y = start_y + cell_height
        start_z = z * cell_depth
        end_z = start_z + cell_depth
        if cell._types is not None:
            new_cell.types[start_z:end_z, start_y:end_y, start_x:end_x] = cell.types
        if cell._colors is not None:
            new_cell.colors[start_z:end_z, start_y:end_y, start_x:end_x] = cell.colors
        if cell._tags is not None:
            new_cell.tags[start_z:end_z, start_y:end_y, start_x:end_x] = cell.tags
    return new_cell

def combine_3d(cell_1: "Cell3d", cell_2: "Cell3d") -> "Cell3d":
    from .models import Cell3d
    new_types = np.kron(cell_1.types, cell_2.types).astype(np.uint8)
    return Cell3d(types=new_types)

def magic_3d(cells: List["Cell3d"]) -> "Cell3d":
    if len(cells) < 2:
        raise MrlyError("Magic composition requires at least two cells.")
    new_cell = combine_3d(cells[0], cells[1])
    for i in range(2, len(cells)):
        new_cell = combine_3d(new_cell, cells[i])
    return new_cell

def special_3d(mask: np.ndarray, cell: "Cell3d") -> "Cell3d":
    depth, height, width = mask.shape
    new_cells = []
    for z in range(depth):
        for y in range(height):
            for x in range(width):
                rotation_index = mask[z, y, x]
                new_cell = deepcopy(cell).rotate(k=int(rotation_index))
                new_cells.append(new_cell)
    return merge_3d(new_cells, width, height, depth)

def mosaic_3d(mask: np.ndarray, cells: List["Cell3d"]) -> "Cell3d":
    depth, height, width = mask.shape
    new_cells = []
    for z in range(depth):
        for y in range(height):
            for x in range(width):
                cell_index = mask[z, y, x]
                new_cell = deepcopy(cells[cell_index])
                new_cells.append(new_cell)
    return merge_3d(new_cells, width, height, depth)

# PRIVATE - MUTABLE

def invert_3d(cell: "Cell3d") -> "Cell3d":
    if cell._types is not None:
        cell.types = 1 - cell.types
    return cell

def pad_3d(cell: "Cell3d", count: int = 1, value: int = 0) -> "Cell3d":
    if cell._types is not None:
        cell.types = np.pad(cell.types, count, mode="constant", constant_values=value)
    if cell._colors is not None:
        cell.colors = np.pad(cell.colors, count, mode="constant", constant_values=value)
    if cell._tags is not None:
        cell.tags = np.pad(cell.tags, count, mode="constant", constant_values=value)
    return cell

def rotate_3d(cell: "Cell3d", k: int = 1, axes: Tuple[int, int] = (1, 2)) -> "Cell3d":
    if cell._types is not None:
        cell.types = np.rot90(cell.types, k=k, axes=axes)
    if cell._colors is not None:
        cell.colors = np.rot90(cell.colors, k=k, axes=axes)
    if cell._tags is not None:
        cell.tags = np.rot90(cell.tags, k=k, axes=axes)
    return cell

def fractal_3d(cell: "Cell3d", level: int = 1) -> "Cell3d":
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

def tile_3d(cell: "Cell3d", width: int, height: int, depth: int) -> "Cell3d":
    if cell._types is not None:
        cell.types = np.tile(cell.types, (depth, height, width))
    if cell._colors is not None:
        cell.colors = np.tile(cell.colors, (depth, height, width, 1))
    if cell._tags is not None:
        cell.tags = np.tile(cell.tags, (depth, height, width))
    return cell

def layers_3d(cell: "Cell3d", dtype: np.dtype = np.dtype(np.uint8)) -> "Cell3d":
    depth, height, width = cell.depth, cell.height, cell.width
    z_indices, y_indices, x_indices = np.indices((depth, height, width))
    center_z = (depth - 1) / 2
    center_y = (height - 1) / 2
    center_x = (width - 1) / 2
    distance_z = np.abs(z_indices - center_z)
    distance_y = np.abs(y_indices - center_y)
    distance_x = np.abs(x_indices - center_x)
    tags = np.floor(distance_x + distance_y + distance_z)
    cell.tags = tags.astype(dtype)
    return cell

def neighbors_3d(cell: "Cell3d", mode: str = "constant") -> "Cell3d":
    kernel = np.ones((3, 3, 3), dtype=np.uint8)
    kernel[1, 1, 1] = 0
    padded = np.pad(cell.types, pad_width=1, mode=mode)
    result = np.zeros_like(cell.types, dtype=np.uint8)
    d, h, w = cell.types.shape
    for z in range(d):
        for y in range(h):
            for x in range(w):
                window = padded[z:z+3, y:y+3, x:x+3]
                count = np.sum(window * kernel)
                result[z, y, x] = count
    cell.tags = result
    return cell
