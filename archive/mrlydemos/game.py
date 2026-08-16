import math
import mrlytwo as m2
import mrlythree as m3
import mrlysix as m6
from mrlycore.colors import black, blue, gradient, gray, white
from mrlycore.enums import Mode
import numpy as np
import os
from colors import *
from config import DATA_DIR
from helpers import hex_key
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
        tile_img = m6.rect_draw(cell, scale=SCALE, start=START)
        ratio = math.sqrt(3) / 2
        w, h = tile_img.size
        orientation = m6.get_orientation(cell.width, cell.height)
        match orientation:
            case m6.Orientation.HORIZONTAL:
                new_h = int(h * ratio)
                tile_img = tile_img.resize((w, new_h), Image.Resampling.NEAREST)
            case m6.Orientation.VERTICAL:
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

def print_cell(cell: m2.Cell2d):
    mapping = {0: "⬜️", 1: "⬛️", 2: "🟦", 3: "🟥", 4: "🟩", 5: "🟪"}
    for row in cell.text(mapping):
        print(row)
    print()

def new_cell():
    cell = m3.net_3d(3, 2)
    cell = m6.cut(cell)
    return cell.cell

def new_mask():
    cell = m2.carpet_2d(3, 1)
    return cell.types

def animate() -> list[m2.Cell2d]:
    cell = new_cell()
    mask = new_mask()
    grids = [cell.copy()]
    current_cell = cell
    for i in range(GENERATIONS):
        print(f"Generation: {i+1}")
        current_cell.neighbors(types=mask, target=TARGET, mode='constant')
        neighbors = current_cell.tags
        current_grid = current_cell.types
        birth_mask = (current_grid == 0) & (np.isin(neighbors, BIRTH_RULE))
        survive_mask = (current_grid == 1) & (np.isin(neighbors, SURVIVE_RULE))
        new_grid = np.zeros_like(current_grid)
        new_grid[birth_mask | survive_mask] = 1
        boundary_mask = (current_grid == 2)
        new_grid[boundary_mask] = 2
        current_cell.types = new_grid
        grids.append(current_cell.copy())
    return grids

def frames(grids: list[m2.Cell2d]):
    title = "frames"
    os.makedirs(f"{DATA_DIR}/{KEY}/{title}", exist_ok=True)
    renderer = Renderer(IMAGE_SIZE)
    images = []
    gradient_colors = gradient([random_secondary(), random_secondary()], steps=5)
    mapping = {0: [white], 1: gradient_colors, 2: [alpha]}
    for i, grid in enumerate(grids):
        grid.paint(mapping, mode=Mode.RANDOM)
        img = renderer.render(grid)
        fp = f"{DATA_DIR}/{KEY}/{title}/frame_{i:02d}.png"
        img.save(fp)
        print(f"Saved: {fp}")
        images.append(img)
    save_gif(images, title)

def heatmap(grids: list[m2.Cell2d]):
    title = "heatmap"
    os.makedirs(f"{DATA_DIR}/{KEY}/{title}", exist_ok=True)
    renderer = Renderer(IMAGE_SIZE)
    images = []
    all_types = [g.types for g in grids]
    ones_stack = [(t == 1).astype(int) for t in all_types]
    total_cumulative = np.sum(ones_stack, axis=0)
    max_val = int(np.max(total_cumulative))
    if max_val < 1: max_val = 1
    start_color = gray
    end_color = black
    gradient_colors = gradient([start_color, end_color], steps=max_val + 1)
    gradient_rgba = np.array([c.to_rgba() for c in gradient_colors], dtype=np.uint8)
    cumulative_grid = np.zeros_like(grids[0].types, dtype=np.int32)
    boundary_color = blue.to_rgba()
    background_color = white.to_rgba()
    for i, grid in enumerate(grids):
        cumulative_grid += (grid.types == 1).astype(np.int32)
        height, width = grid.height, grid.width
        colors = np.full((height, width, 4), background_color, dtype=np.uint8)
        boundary_mask = (grid.types == 2)
        colors[boundary_mask] = boundary_color
        heat_mask = (cumulative_grid > 0) & (~boundary_mask)
        heat_values = cumulative_grid[heat_mask]
        colors[heat_mask] = gradient_rgba[heat_values]
        hm_cell = grid.copy()
        hm_cell.colors = colors
        img = renderer.render(hm_cell)
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
    cell = m3.carpet_3d(3, 1)
    cell = m6.iso(cell)
    print("ISO")
    for i in range(20):
        test_cell = cell.copy()
        test_cell = m6.pad(test_cell, k=i)
        print(f"Pad: {i}")
        print(f"Width: {test_cell.width}")
        print(f"Height: {test_cell.height}")
        print(f"Is_hex: {m6.is_hex(test_cell)}")
        print_cell(test_cell)

def test_blank():
    orientation = "vertical"
    for i in range(1, 20):
        test_cell = m6.blank(i, orientation)
        print(f"Orientation: {orientation}")
        print(f"Radius: {i}")
        print(f"Width: {test_cell.width}")
        print(f"Height: {test_cell.height}")
        print(f"Is_hex: {m6.is_hex(test_cell)}")
        print_cell(test_cell)

if __name__ == "__main__":
    main()
