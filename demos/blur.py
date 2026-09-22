import os
import random
from config import DATA_DIR
from helpers import decode
from mrlypy.core import Rng
from mrlypy.core.colors import random as random_color
from mrlypy.math import two
from mrlypy.math.cell import models, paint
from PIL import Image

RNG = Rng(random.getrandbits(32))

def rc(): return random_color(False, RNG)

def main():
    os.makedirs(DATA_DIR, exist_ok=True)
    cell = two.carpet(5, 1)
    palette = {
        0: [rc(), rc(), rc()],
        1: [rc(), rc(), rc()],
    }
    SIZE = (1000, 1000)
    image = decode(two.png(paint(cell, palette, "Random", RNG), 1, None, 0, "Square"))
    image = image.resize(SIZE, resample=Image.Resampling.LANCZOS)
    fp = os.path.join(DATA_DIR, "blur.png")
    image.save(fp)
    print(f"Saved: {fp}")
    SIZE = (1920, 1080)
    cell = models.tile(cell, 16, 9)
    image = decode(two.png(paint(cell, palette, "Random", RNG), 1, None, 0, "Square"))
    image = image.resize(SIZE, resample=Image.Resampling.LANCZOS)
    image = image.convert("RGB")
    fp = os.path.join(DATA_DIR, "blur.jpg")
    image.save(fp, "JPEG")
    print(f"Saved: {fp}")

if __name__ == "__main__":
    main()
