import math

import numpy as np
from PIL import Image
from mrlypy.core import Rng
from mrlypy.core.colors import BLACK, WHITE, gradient, named
from mrlypy.math import six, three
from mrlypy.math.cell import models
from mrlypy.math.six import FILL, GRID, VOID

from lib.canvas import H3, decode, quantize
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
    types = cell["cell"]["types"]
    h, w = types.shape
    rows = h + 2 * MARGIN
    cols = math.ceil(2 * ASPECT * rows * H3 - 1)
    side = max(0, math.ceil((cols - w) / 2))
    side += side % 2
    grid = np.full((rows, w + 2 * side), GRID, dtype=np.uint8)
    grid[MARGIN:MARGIN + h, side:side + w] = types
    return {**cell, "cell": models.new(grid)}

# PAINT

def rainbow(cell):
    palette = {
        VOID: [WHITE],
        FILL: [BLACK],
        GRID: gradient([named(name) for name in HUES], STEPS),
    }
    return six.paint(cell, palette, "Random", Rng(SEED))

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
    cell = rainbow(widen(six.cut(three.carpet(NUMBER, LEVEL))))
    scale = math.ceil(2 * WIDTH / (six.width(cell) + 1))
    image = decode(six.png(cell, scale, None, 0))
    w, h = image.size
    image = crop(image.resize((w, round(h * H3)), Image.LANCZOS))
    image = quantize(image, COLORS)
    image.save(HERO, optimize=True)
    print("wrote %s %dx%d %.2f MB" % (show(HERO), *image.size, HERO.stat().st_size / 1e6))

if __name__ == "__main__":
    main()
