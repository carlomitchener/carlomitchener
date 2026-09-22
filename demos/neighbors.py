import random
import numpy as np
from config import DATA_DIR
from helpers import save
from mrlypy.core import Rng
from mrlypy.core.colors import BLACK
from mrlypy.core.colors import random as random_color
from mrlypy.math import two
from mrlypy.math.cell import models, paint

def main():
    rng = Rng(random.getrandbits(32))
    cell = two.net(5, 2)
    mask = two.net(3, 1)["types"]
    mask[1, 1] = 0
    num_colors = np.sum(mask)
    mode = "Tag"
    fill = [BLACK]
    void = [random_color(False, rng) for _ in range(num_colors + 1)]
    cell = models.neighbors(cell, mask, 1, False)
    save(f"{DATA_DIR}/neighbors.png", two.png(paint(cell, {0: void, 1: fill}, mode), 10, None, 0, "Square"))
    print(cell["tags"])

if __name__ == "__main__":
    main()
