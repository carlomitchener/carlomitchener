import mrlytwo as m2
import mrlythree as m3
import mrlysix as m6
from mrlycore.enums import Mode
import numpy as np
import random
from colors import *
from config import DATA_DIR
from PIL import Image
from typing import Tuple

# SETTINGS
SCALE = 5
RESIZE = True
WIDTH = random.randint(3, 9)
HEIGHT = random.randint(3, 9)
TILE = "LINEAR"
CROP = True
FLIP = False

# PAINT

MODE = Mode.RANDOM
PRIMARY = random_primary()
LIGHTNESS = 33 if PRIMARY == black else 77 if PRIMARY == white else 50
VOID = [c.lightness(LIGHTNESS) for c in random_gradient()]
FILL = [PRIMARY]
GRID = [alpha]
UP = [random_secondary().lightness(LIGHTNESS)]
LEFT = [random_secondary().lightness(LIGHTNESS)]
RIGHT = [random_secondary().lightness(LIGHTNESS)]
PALETTE = {0: VOID, 1: FILL, 2: GRID, 3: UP, 4: LEFT, 5: RIGHT}

# RESIZE

def resize(image: Image.Image, orientation: str) -> Image.Image:
    import math
    ratio = math.sqrt(3) / 2
    w, h = image.size
    if orientation == "horizontal":
        w = image.width
        h = int(image.height * ratio)
    if orientation == "vertical":
        w = int(image.width * ratio)
        h = image.height
    return image.resize((w, h), Image.Resampling.LANCZOS)

# HELPERS

def get_parity(value: int) -> str:
    return "EVEN" if value % 2 == 0 else "ODD"

def get_start(cell: m2.Cell2d, name: str) -> int:
    width = get_parity(cell.width)
    value = 0
    if TILE == "LINEAR":
        if "iso" in name:
            value = 0 if CROP else 1
            if width == "EVEN":
                value = int(not value)
        if "pro" in name:
            value = 0 if CROP else 1
            if width == "EVEN":
                value = int(not value)
        if "cut" in name:
            value = 1 if CROP else 0
    if TILE == "RADIAL":
        radius = get_parity(WIDTH)
        if radius == "EVEN":
            value = 0
        if radius == "ODD":
            value = 0 if CROP else 1
        if "cut" in name:
            value = int(not value)
    return value if not FLIP else int(not value)

def get_orientation(name: str) -> str:
    return {
        "iso": "vertical",
        "pro": "vertical",
        "cut": "horizontal",
    }[name]

# SAVE

def save_triangles_png(cell: m2.Cell2d, name: str):
    fp = f"{DATA_DIR}/{name}_triangles.png"
    image = m6.draw(cell, SCALE, get_orientation(name), get_start(cell, name))
    if RESIZE:
        image = resize(image, get_orientation(name))
    image.save(fp)
    print(f"Saved: {fp}")

def save_triangles_svg(cell: m2.Cell2d, name: str):
    fp = f"{DATA_DIR}/{name}_triangles.svg"
    svg = m6.svg(cell, SCALE, get_orientation(name), get_start(cell, name))
    with open(fp, "w") as f:
        f.write(svg)
    print(f"Saved: {fp}")

def save_squares_png(cell: m2.Cell2d, name: str):
    fp = f"{DATA_DIR}/{name}_squares.png"
    image = cell.to_image(SCALE)
    image.save(fp)
    print(f"Saved: {fp}")

def save_squares_svg(cell: m2.Cell2d, name: str):
    fp = f"{DATA_DIR}/{name}_squares.svg"
    svg = cell.svg_square(SCALE)
    with open(fp, "w") as f:
        f.write(svg)
    print(f"Saved: {fp}")

def print_txt(cell: m2.Cell2d, name: str):
    print(name)
    emoji_mode = True
    if emoji_mode:
        mapping = {0: "⬜️", 1: "⬛️", 2: "🟨", 3: "🟥", 4: "🟩", 5: "🟦"}
        for row in cell.text(mapping): print(row)
    else:
        for row in cell.text(): print(row)
    print()

def save(cell: m2.Cell2d, name: str):
    save_triangles_png(cell, name)
    save_triangles_svg(cell, name)
    save_squares_png(cell, name)
    save_squares_svg(cell, name)

# BUILD

def magic():
    cell_1 = m3.random_3d(random.choice([3, 5]), 1)
    cell_2 = m3.random_3d(random.choice([3, 5]), 1)
    cell = m3.magic_3d([cell_1, cell_2])
    return cell

def general():
    number = random.choice([3, 5])
    grid = random.choice([1, 3])
    level = 1
    cell = m3.random_3d(number, level)
    cell = cell.tile(grid, grid, grid)
    return cell

def new_cell():
    return m3.carpet_3d(5, 2)

# MAIN

def main():
    factory = {
        "iso": m6.iso,
        "pro": m6.pro,
        "cut": m6.cut,
    }
    for name, func in factory.items():
        cell = new_cell()
        cell = func(cell)
        size = (cell.width, cell.height)
        if TILE == "LINEAR":
            cell = m6.tile(cell, WIDTH, HEIGHT)
            cell = m6.tile_crop(cell, size) if CROP else cell
        if TILE == "RADIAL":
            cell = m6.radial(cell, WIDTH)
            cell = m6.radial_crop(cell, size) if CROP else cell
        cell = cell.paint(PALETTE, mode=MODE)
        print(f"WidthxHeight: {cell.width}x{cell.height}")
        print(f"Width={get_parity(cell.width)}")
        print(f"Height={get_parity(cell.height)}")
        save(cell, name)

if __name__ == "__main__":
    main()
