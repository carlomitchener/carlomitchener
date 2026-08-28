import os
import sys

# MRLYPROD

HERE = os.path.dirname(os.path.abspath(__file__))
MRLYPROD = os.path.normpath(os.path.join(HERE, ".."))

if not os.path.isdir(os.path.join(MRLYPROD, "mrlypy", "six")):
    sys.exit(f"missing mrlypy: expected it at {MRLYPROD}")

sys.path.insert(0, MRLYPROD)

import mrlypy.two as m2
import numpy as np
from config import DATA_DIR, IMAGE_SIZE
from helpers import hex_key
from PIL import Image
from typing import Iterable

INVERT = False
LEVEL = 1
LIMIT = 50
MODE = "FIT"
PAINT = "GRAYSCALE"
ODDS = [i for i in range(1, LIMIT, 2)]
NUMBERS = ODDS
FUNCS = [
    m2.carpet_2d,
    m2.net_2d,
    m2.tree_2d,
    m2.void_2d,
]

def pad_grid(grid: np.ndarray, max_height: int, max_width: int) -> np.ndarray:
    pad_height = max_height - grid.shape[0]
    pad_width = max_width - grid.shape[1]
    pad_top = pad_height // 2
    pad_bottom = pad_height - pad_top
    pad_left = pad_width // 2
    pad_right = pad_width - pad_left
    return np.pad(grid, ((pad_top, pad_bottom), (pad_left, pad_right)), 'constant')

def resize_grid(grid: np.ndarray) -> np.ndarray:
    if grid.shape == IMAGE_SIZE:
        return grid
    old_height, old_width = grid.shape
    new_y, new_x = np.indices(IMAGE_SIZE)
    old_x = (new_x * old_width / IMAGE_SIZE[1]).astype(int)
    old_y = (new_y * old_height / IMAGE_SIZE[0]).astype(int)
    return grid[old_y, old_x]

def create_color_map(max_value: int) -> np.ndarray:
    if max_value == 0:
        return np.array([[0, 0, 0]], dtype=np.uint8)
    grayscale_map = np.linspace(0, 255, max_value + 1, dtype=np.uint8)
    color_maps = {
        "GRAYSCALE": np.stack([grayscale_map] * 3, axis=1),
        "RANDOM": np.random.randint(0, 256, size=(max_value + 1, 3), dtype=np.uint8),
    }
    color_map = color_maps[PAINT]
    color_map[0] = [0, 0, 0]
    return color_map

def draw_step(grid: np.ndarray, name: str):
    fp = f"{DATA_DIR}/{name}.png"
    max_val = np.max(grid)
    color_map = create_color_map(max_val)
    image_array = color_map[grid]
    image = Image.fromarray(image_array, 'RGB')
    image = image.resize(IMAGE_SIZE, Image.Resampling.NEAREST)
    image.save(fp, "PNG")
    print(f"Saved: {fp}")

def generate_steps(title: str, grids: Iterable[np.ndarray], mode: str):
    heatmap = None
    if mode == "FIT":
        heatmap = np.zeros(IMAGE_SIZE, dtype=np.int16)
        for grid in grids:
            heatmap += resize_grid(grid)
    elif mode == "GROW":
        for grid in grids:
            if heatmap is None:
                heatmap = grid.astype(np.int16)
            else:
                h_h, h_w = heatmap.shape
                g_h, g_w = grid.shape
                new_h = max(h_h, g_h)
                new_w = max(h_w, g_w)
                if new_h > h_h or new_w > h_w:
                    heatmap = pad_grid(heatmap, new_h, new_w)
                padded_grid = pad_grid(grid, new_h, new_w)
                heatmap += padded_grid
    if heatmap is not None:
        draw_step(heatmap, f"{title}_{hex_key(4)}")

def main():
    for func in FUNCS:
        if INVERT:
            grids = (func(number, LEVEL).invert().to_array() for number in NUMBERS)
        else:
            grids = (func(number, LEVEL).to_array() for number in NUMBERS)
        generate_steps(func.__name__, grids, MODE)

if __name__ == "__main__":
    main()
