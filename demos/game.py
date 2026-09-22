import math
import os
import random
import numpy as np
from colors import random_secondary
from config import DATA_DIR
from helpers import decode
from mrlypy.core import Rng
from mrlypy.core.colors import ALPHA, BLACK, BLUE, GRAY, WHITE, gradient
from mrlypy.math import six, three, two
from mrlypy.math.cell import models, paint
from PIL import Image

ORIENTATION = "landscape"
FRAME_SIZES = {
    "portrait": (1080, 1920),
    "landscape": (1920, 1080),
    "square": (1080, 1080),
}
IMAGE_SIZE = FRAME_SIZES[ORIENTATION]
SCALE = 10

GENERATIONS = 25
BIRTH_RULE = [2, 4, 6, 8]
SURVIVE_RULE = [2, 4, 6, 8]
TARGET = 1
START = 0
RNG = Rng(random.getrandbits(32))

KEY = "test"
os.makedirs(f"{DATA_DIR}/{KEY}", exist_ok=True)

def save_gif(images: list[Image.Image], title: str):
    if not images:
        return
    fp = f"{DATA_DIR}/{KEY}/{title}.gif"
    images[0].save(fp, save_all=True, append_images=images[1:], duration=200, loop=0)
    print(f"Saved: {fp}")

class Renderer:

    def __init__(self, target_size):
        self.target_width, self.target_height = target_size

    def render(self, cell):
        orientation = six.orientation(models.width(cell), models.height(cell))
        tile_img = decode(six.rect_png(six.new(cell, "Cut", orientation, START), SCALE, START))
        ratio = math.sqrt(3) / 2
        w, h = tile_img.size
        match orientation:
            case "Horizontal":
                new_h = int(h * ratio)
                tile_img = tile_img.resize((w, new_h), Image.Resampling.NEAREST)
            case "Vertical":
                new_w = int(w * ratio)
                tile_img = tile_img.resize((new_w, h), Image.Resampling.NEAREST)
        tile_arr = np.array(tile_img)
        h, w, _ = tile_arr.shape
        target_h, target_w = self.target_height, self.target_width
        if h > target_h:
            start_y = (h - target_h) // 2
            tile_arr = tile_arr[start_y:start_y+target_h, :, :]
            h = target_h
        if w > target_w:
            start_x = (w - target_w) // 2
            tile_arr = tile_arr[:, start_x:start_x+target_w, :]
            w = target_w
        pad_h = max(0, target_h - h)
        pad_w = max(0, target_w - w)
        pad_top = (pad_h + 1) // 2
        pad_bottom = pad_h - pad_top
        pad_left = (pad_w + 1) // 2
        pad_right = pad_w - pad_left
        if pad_h > 0 or pad_w > 0:
            tile_arr = np.pad(
                tile_arr,
                ((pad_top, pad_bottom), (pad_left, pad_right), (0, 0)),
                mode='reflect'
            )
        return Image.fromarray(tile_arr)

def print_cell(cell: dict):
    mapping = {0: "⬜️", 1: "⬛️", 2: "🟦", 3: "🟥", 4: "🟩", 5: "🟪"}
    for row in two.text(cell, mapping):
        print(row)
    print()

def new_cell():
    return six.cut(three.net(3, 2))["cell"]

def new_mask():
    return two.carpet(3, 1)["types"]

def animate() -> list[dict]:
    cell = new_cell()
    mask = new_mask()
    grids = [cell]
    for i in range(GENERATIONS):
        print(f"Generation: {i+1}")
        neighbors = models.neighbors(cell, mask, TARGET, False)["tags"]
        current_grid = cell["types"]
        birth_mask = (current_grid == 0) & (np.isin(neighbors, BIRTH_RULE))
        survive_mask = (current_grid == 1) & (np.isin(neighbors, SURVIVE_RULE))
        new_grid = np.zeros_like(current_grid)
        new_grid[birth_mask | survive_mask] = 1
        boundary_mask = (current_grid == 2)
        new_grid[boundary_mask] = 2
        cell = models.new(new_grid)
        grids.append(cell)
    return grids

def frames(grids: list[dict]):
    title = "frames"
    os.makedirs(f"{DATA_DIR}/{KEY}/{title}", exist_ok=True)
    renderer = Renderer(IMAGE_SIZE)
    images = []
    gradient_colors = gradient([random_secondary(), random_secondary()], 5)
    mapping = {0: [WHITE], 1: gradient_colors, 2: [ALPHA]}
    for i, grid in enumerate(grids):
        img = renderer.render(paint(grid, mapping, "Random", RNG))
        fp = f"{DATA_DIR}/{KEY}/{title}/frame_{i:02d}.png"
        img.save(fp)
        print(f"Saved: {fp}")
        images.append(img)
    save_gif(images, title)

def heatmap(grids: list[dict]):
    title = "heatmap"
    os.makedirs(f"{DATA_DIR}/{KEY}/{title}", exist_ok=True)
    renderer = Renderer(IMAGE_SIZE)
    images = []
    all_types = [g["types"] for g in grids]
    ones_stack = [(t == 1).astype(int) for t in all_types]
    total_cumulative = np.sum(ones_stack, axis=0)
    max_val = int(np.max(total_cumulative))
    if max_val < 1: max_val = 1
    gradient_colors = gradient([GRAY, BLACK], max_val + 1)
    gradient_rgba = np.array(gradient_colors, dtype=np.uint8)
    cumulative_grid = np.zeros_like(grids[0]["types"], dtype=np.int32)
    for i, grid in enumerate(grids):
        types = grid["types"]
        cumulative_grid += (types == 1).astype(np.int32)
        colors = np.full((*types.shape, 4), WHITE, dtype=np.uint8)
        boundary_mask = (types == 2)
        colors[boundary_mask] = BLUE
        heat_mask = (cumulative_grid > 0) & (~boundary_mask)
        heat_values = cumulative_grid[heat_mask]
        colors[heat_mask] = gradient_rgba[heat_values]
        img = renderer.render({**grid, "colors": colors})
        fp = f"{DATA_DIR}/{KEY}/{title}/heatmap_{i:02d}.png"
        img.save(fp)
        print(f"Saved: {fp}")
        images.append(img)
    save_gif(images, title)

def main():
    grids = animate()
    frames(grids)
    heatmap(grids)

def test_pad():
    cell = six.iso(three.carpet(3, 1))
    print("ISO")
    for i in range(20):
        test_cell = six.pad(cell, i, 0)
        print(f"Pad: {i}")
        print(f"Width: {six.width(test_cell)}")
        print(f"Height: {six.height(test_cell)}")
        print(f"Is_hex: {six.is_hex(test_cell['cell'])}")
        print_cell(test_cell["cell"])

def test_blank():
    orientation = "Vertical"
    for i in range(1, 20):
        test_cell = six.blank(i, orientation, 1, 0)
        print(f"Orientation: {orientation}")
        print(f"Radius: {i}")
        print(f"Width: {models.width(test_cell)}")
        print(f"Height: {models.height(test_cell)}")
        print(f"Is_hex: {six.is_hex(test_cell)}")
        print_cell(test_cell)

if __name__ == "__main__":
    main()
