import math
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))

import mrlytwo as mp
from mrlycore.colors import white, black
from mrlycore.enums import Mode

# CONFIG
GRID = 5
MAPPING = {0: [white], 1: [black]}
PAINT_MODE = Mode.TYPE
OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "..", "public", "icons")
SIZES = [192, 512]

def create_icon(target: int):
    cell = mp.carpet_2d(GRID)
    scale = math.ceil(target / GRID)
    scaled = mp.combine_2d(cell, mp.ones_2d(scale))
    scaled = scaled.paint(MAPPING, PAINT_MODE)
    img = mp.to_image(scaled, scale=1)
    rendered = GRID * scale
    if rendered != target:
        offset = (rendered - target) // 2
        img = img.crop((offset, offset, offset + target, offset + target))
    return img

def generate():
    for size in SIZES:
        img = create_icon(size)
        filename = f"mrly_{size}_{size}.png"
        path = os.path.join(OUTPUT_DIR, filename)
        img.save(path)
        print(f"{filename} ({img.size[0]}x{img.size[1]})")

if __name__ == "__main__":
    pass
