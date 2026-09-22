import numpy as np
from config import DATA_DIR
from helpers import decode, save
from mrlypy.core.colors import ALPHA, BLACK, BLUE, GREEN, RED, WHITE
from mrlypy.math import six, three, two
from mrlypy.math.cell import models
from PIL import Image

# HELPERS
def resize(image: Image.Image, orientation: str) -> Image.Image:
    import math
    ratio = math.sqrt(3) / 2
    w, h = image.size
    if orientation == "Horizontal":
        w = image.width
        h = int(image.height * ratio)
    if orientation == "Vertical":
        w = int(image.width * ratio)
        h = image.height
    return image.resize((w, h), Image.Resampling.NEAREST)

def get_parity(value: int) -> str:
    return "EVEN" if value % 2 == 0 else "ODD"

def get_start(name: str) -> int:
    value = 0
    if "iso" in name:
        value = 1
    if "pro" in name:
        value = 1
    if "cut" in name:
        value = 0
    if get_parity(NUMBER**LEVEL) == "EVEN":
        value = not value
    return int(not value if FLIP else value)

def save_draw(cell: dict, name: str):
    fp = f"{DATA_DIR}/rect_{name}.png"
    image = decode(six.rect_png(cell, 10, get_start(name)))
    if RESIZE:
        image = resize(image, six.orientation(six.width(cell), six.height(cell)))
    image.save(fp)
    print(f"Saved: {fp}")
    if TILE:
        pixels = np.array(image)
        sheet = {**models.new(np.zeros(pixels.shape[:2], dtype=np.uint8)), "colors": pixels}
        sheet = models.tile(sheet, WIDTH, HEIGHT)
        save(f"{DATA_DIR}/rect_{name}_{WIDTH}_{HEIGHT}.png", two.png(sheet, 1, None, 0, "Square"))
    return cell

def save_svg(cell: dict, name: str):
    save(f"{DATA_DIR}/rect_{name}.svg", six.rect_svg(cell, 10, get_start(name)))

def print_cell(cell: dict, name: str):
    print(name)
    for row in two.text(cell["cell"]):
        print(row)
    print()

def save_all(cell: dict, name: str):
    save_draw(cell, name)
    save_svg(cell, name)

def new_cell():
    return three.carpet(NUMBER, LEVEL)

# SETTINGS

SCALE = 10
WIDTH = 3
HEIGHT = 3
TILE = True
RESIZE = True
NUMBER = 5
LEVEL = 1
FLIP = False

def main():
    palette = {0: [WHITE], 1: [BLACK], 2: [ALPHA], 3: [RED], 4: [GREEN], 5: [BLUE]}
    save_all(six.paint(six.iso(new_cell()), palette), "iso")
    save_all(six.paint(six.pro(new_cell()), palette), "pro")
    save_all(six.paint(six.cut(new_cell()), palette), "cut")

if __name__ == "__main__":
    main()
