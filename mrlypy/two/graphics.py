from typing import List, TYPE_CHECKING

import numpy as np

from mrlypy.core.colors import Color
from mrlypy.core.errors import MrlyError

if TYPE_CHECKING:
    from .models import Cell2d

# SAMPLING

def get_type(rgb_array: np.ndarray, level: int) -> np.ndarray:
    return (np.mean(rgb_array[:, :, :3], axis=2) < level).astype(np.int8)

def get_color(rgb_array: np.ndarray, palette: List[Color]) -> np.ndarray:
    if not palette:
        raise MrlyError("Cannot recolor with an empty palette.")
    palette_array = np.array([c.to_rgba() for c in palette], dtype=np.uint8)
    distances = np.sum((rgb_array[:, :, np.newaxis, :] - palette_array[np.newaxis, np.newaxis, :, :]) ** 2, axis=3)
    closest_indices = np.argmin(distances, axis=2)
    return palette_array[closest_indices]

# FILTERS

def perforate(types_array: np.ndarray, cell: "Cell2d") -> np.ndarray:
    height, width = types_array.shape
    if width == 0 or height == 0:
        return types_array
    tiled_mask = np.tile(cell.types, (
        (height + cell.height - 1) // cell.height,
        (width + cell.width - 1) // cell.width,
    ))
    return tiled_mask[:height, :width]

def binarize(colors_array: np.ndarray, level: int = 128) -> np.ndarray:
    if not isinstance(level, int) or not (0 <= level <= 255):
        raise MrlyError(f"Binarize level must be an integer between 0 and 255, got {level}")
    return get_type(colors_array, level)

def recolor(colors_array: np.ndarray, palette: List[Color]) -> np.ndarray:
    return get_color(colors_array, palette)

def blur(colors_array: np.ndarray, radius: int = 1) -> np.ndarray:
    if not isinstance(radius, int) or radius < 0:
        raise MrlyError(f"Blur radius must be a non-negative integer, got {radius}")
    if radius == 0:
        return colors_array
    padded = np.pad(colors_array.astype(np.float32), ((radius, radius), (radius, radius), (0, 0)), "edge")
    integral_image = padded.cumsum(axis=0).cumsum(axis=1)
    r = radius
    top_left = integral_image[2 * r:, 2 * r:]
    top_right = integral_image[2 * r:, :-(2 * r)]
    bottom_left = integral_image[:-(2 * r), 2 * r:]
    bottom_right = integral_image[:-(2 * r), :-(2 * r)]
    box_area = (2 * r + 1) ** 2
    blurred_float = (top_left - top_right - bottom_left + bottom_right) / box_area
    return np.clip(blurred_float, 0, 255).astype(np.uint8)
