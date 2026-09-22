import random
from colors import random_gradient, random_primary, random_secondary
from config import DATA_DIR
from helpers import decode, save
from mrlypy.core import Rng
from mrlypy.core.colors import ALPHA, BLACK, WHITE, lightness
from mrlypy.math import six, three, two
from mrlypy.math.cell import models, paint
from PIL import Image

# SETTINGS
SCALE = 5
RESIZE = True
WIDTH = random.randint(3, 9)
HEIGHT = random.randint(3, 9)
TILE = "LINEAR"
CROP = True
FLIP = False
RNG = Rng(random.getrandbits(32))

# PAINT

MODE = "Random"
PRIMARY = random_primary()
LIGHTNESS = 33 if PRIMARY == BLACK else 77 if PRIMARY == WHITE else 50
VOID = [lightness(c, LIGHTNESS) for c in random_gradient()]
FILL = [PRIMARY]
GRID = [ALPHA]
UP = [lightness(random_secondary(), LIGHTNESS)]
LEFT = [lightness(random_secondary(), LIGHTNESS)]
RIGHT = [lightness(random_secondary(), LIGHTNESS)]
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

def get_start(cell: dict, name: str) -> int:
    width = get_parity(models.width(cell))
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

def hexagon(cell: dict, name: str) -> dict:
    orientation = six.orientation(models.width(cell), models.height(cell))
    return six.new(cell, name.capitalize(), orientation, get_start(cell, name))

# SAVE

def save_triangles_png(cell: dict, name: str):
    fp = f"{DATA_DIR}/{name}_triangles.png"
    image = decode(six.png(hexagon(cell, name), SCALE, None, 0))
    if RESIZE:
        image = resize(image, get_orientation(name))
    image.save(fp)
    print(f"Saved: {fp}")

def save_triangles_svg(cell: dict, name: str):
    save(f"{DATA_DIR}/{name}_triangles.svg", six.svg(hexagon(cell, name), SCALE, None, 0))

def save_squares_png(cell: dict, name: str):
    save(f"{DATA_DIR}/{name}_squares.png", two.png(cell, SCALE, None, 0, "Square"))

def save_squares_svg(cell: dict, name: str):
    save(f"{DATA_DIR}/{name}_squares.svg", two.svg(cell, SCALE, None, 0, "Square"))

def print_txt(cell: dict, name: str):
    print(name)
    emoji_mode = True
    if emoji_mode:
        mapping = {0: "⬜️", 1: "⬛️", 2: "🟨", 3: "🟥", 4: "🟩", 5: "🟦"}
        for row in two.text(cell, mapping): print(row)
    else:
        for row in two.text(cell): print(row)
    print()

def save_all(cell: dict, name: str):
    save_triangles_png(cell, name)
    save_triangles_svg(cell, name)
    save_squares_png(cell, name)
    save_squares_svg(cell, name)

# BUILD

def random_3d(number: int, level: int) -> dict:
    return [three.carpet, three.net, three.ztree, three.void][RNG.below(4)](number, level)

def magic():
    cell_1 = random_3d(random.choice([3, 5]), 1)
    cell_2 = random_3d(random.choice([3, 5]), 1)
    return three.magic([cell_1, cell_2])

def general():
    number = random.choice([3, 5])
    grid = random.choice([1, 3])
    level = 1
    cell = random_3d(number, level)
    return models.tile(cell, grid, grid, grid)

def new_cell():
    return three.carpet(5, 2)

# MAIN

def main():
    factory = {
        "iso": six.iso,
        "pro": six.pro,
        "cut": six.cut,
    }
    for name, func in factory.items():
        cell = func(new_cell())
        size = (six.width(cell), six.height(cell))
        if TILE == "LINEAR":
            cell = six.tile(cell, WIDTH, HEIGHT)
            cell = six.tile_crop(cell, size) if CROP else cell
        if TILE == "RADIAL":
            cell = six.radial(cell, WIDTH)
            cell = six.radial_crop(cell, WIDTH, size) if CROP else cell
        cell = paint(cell, PALETTE, MODE, RNG)
        print(f"WidthxHeight: {models.width(cell)}x{models.height(cell)}")
        print(f"Width={get_parity(models.width(cell))}")
        print(f"Height={get_parity(models.height(cell))}")
        save_all(cell, name)

if __name__ == "__main__":
    main()
