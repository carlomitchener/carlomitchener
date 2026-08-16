import mrlytwo as m2
import mrlythree as m3
import mrlysix as m6
from mrlycore.colors import alpha, black, blue, green, red, white
from config import DATA_DIR
from PIL import Image, ImageDraw
from typing import List, Tuple

# HELPERS
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
    return not value if FLIP else value

def save_draw(cell: m2.Cell2d, name: str):
    fp = f"{DATA_DIR}/rect_{name}.png"
    image = m6.rect_draw(cell, 10, get_start(name))
    if RESIZE:
        image = resize(image, m6.get_orientation(cell.width, cell.height))
    image.save(fp)
    print(f"Saved: {fp}")
    if TILE:
        fp = f"{DATA_DIR}/rect_{name}_{WIDTH}_{HEIGHT}.png"
        image = m2.Cell2d.from_image(image).tile(WIDTH, HEIGHT).to_image(scale=1)
        image.save(fp)
        print(f"Saved: {fp}")
    return cell

def save_svg(cell: m2.Cell2d, name: str):
    fp = f"{DATA_DIR}/rect_{name}.svg"
    svg = m6.rect_svg(cell, 10, get_start(name))
    with open(fp, "w") as f:
        f.write(svg)
    print(f"Saved: {fp}")

def print_cell(cell: m2.Cell2d, name: str):
    print(name)
    for row in cell.text():
        print(row)
    print()

def save(cell: m2.Cell2d, name: str):
    save_draw(cell, name)
    save_svg(cell, name)

def new_cell():
    return m3.carpet_3d(NUMBER, LEVEL)

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
    palette = {0: [white], 1: [black], 2: [alpha], 3: [red], 4: [green], 5: [blue]}
    save(m6.iso(new_cell()).paint(palette), "iso")
    save(m6.pro(new_cell()).paint(palette), "pro")
    save(m6.cut(new_cell()).paint(palette), "cut")

if __name__ == "__main__":
    main()
