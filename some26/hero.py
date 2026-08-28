import math

import lib  # noqa: F401 — lib/__init__.py puts mrlypy on sys.path

import numpy as np
from PIL import Image
from mrlypy.core.colors import black, gradient, ink, white
from mrlypy.core.enums import Mode
from mrlypy.core.state import seed
from mrlypy.six import FILL, GRID, VOID
from mrlypy.six.designs import carpet_cut
from mrlypy.six.renderer import draw

from lib.canvas import H3, quantize
from lib.paths import HERO, ensure, show

NUMBER = 5
LEVEL = 2
MARGIN = 0
WIDTH = 1920
ASPECT = 16 / 9
SEED = 26
STEPS = 240
COLORS = 256
HUES = ["red", "orange", "yellow", "green", "mint", "cyan", "blue", "indigo", "purple", "pink", "red"]

# FRAME

def widen(cell):
    types = cell.types
    h, w = types.shape
    rows = h + 2 * MARGIN
    cols = math.ceil(2 * ASPECT * rows * H3 - 1)
    side = max(0, math.ceil((cols - w) / 2))
    side += side % 2
    grid = np.full((rows, w + 2 * side), GRID, dtype=np.uint8)
    grid[MARGIN:MARGIN + h, side:side + w] = types
    cell.types = grid
    return cell

# PAINT

def rainbow(cell):
    palette = {
        VOID: [white],
        FILL: [black],
        GRID: gradient([ink(name) for name in HUES], STEPS),
    }
    seed(SEED)
    return cell.paint(palette, Mode.RANDOM)

# CROP

def crop(image):
    w, h = image.size
    box = round(w / ASPECT)
    if box <= h:
        top = (h - box) // 2
        image = image.crop((0, top, w, top + box))
    else:
        box = round(h * ASPECT)
        left = (w - box) // 2
        image = image.crop((left, 0, left + box, h))
    return image.convert("RGB").resize((WIDTH, round(WIDTH / ASPECT)), Image.LANCZOS)

# RUN

def main():
    ensure()
    cell = rainbow(widen(carpet_cut(NUMBER, LEVEL)))
    scale = math.ceil(2 * WIDTH / (cell.width + 1))
    image = draw(cell, scale=scale, start=cell.start)
    w, h = image.size
    image = crop(image.resize((w, round(h * H3)), Image.LANCZOS))
    image = quantize(image, COLORS)
    image.save(HERO, optimize=True)
    print("wrote %s %dx%d %.2f MB" % (show(HERO), *image.size, HERO.stat().st_size / 1e6))

if __name__ == "__main__":
    main()
