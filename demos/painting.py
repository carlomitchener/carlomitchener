from colors import PRIMARIES, SECONDARIES
from config import DATA_DIR
from helpers import save
from mrlypy.core import Rng
from mrlypy.core.colors import gradient
from mrlypy.math import two
from mrlypy.math.cell import models, paint

def main():
    design = two.carpet
    scale = 33
    number = 55
    steps = 77
    rng = Rng(99)
    PAINT_MAP = {0: PRIMARIES, 1: gradient(SECONDARIES, steps)}
    def new_cell():
        return design(number, 1)
    cells = {
        "enumerate": paint(new_cell(), PAINT_MAP, "Enumerate"),
        "index": paint(new_cell(), PAINT_MAP, "Index"),
        "row": paint(new_cell(), PAINT_MAP, "Row"),
        "column": paint(new_cell(), PAINT_MAP, "Column"),
        "random": paint(new_cell(), PAINT_MAP, "Random", rng),
        "layers": paint(models.layers(new_cell()), PAINT_MAP, "Tag"),
        "neighbors": paint(models.neighbors(new_cell(), new_cell()["types"], 1, False), PAINT_MAP, "Tag"),
    }
    for name, cell in cells.items():
        save(f"{DATA_DIR}/{name}.png", two.png(cell, scale, None, 0, "Square"))

if __name__ == "__main__":
    main()
