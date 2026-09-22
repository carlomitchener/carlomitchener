from config import DATA_DIR
from helpers import save
from mrlypy.core.colors import RED
from mrlypy.math import two
from mrlypy.math.cell import models, paint

SHAPES = {"squares": "Square", "circles": "Circle", "diamonds": "Diamond"}

def new_cell():
    return paint(models.tile(two.carpet(3, 2), 2, 2))

def main():
    cell = new_cell()
    for name, shape in SHAPES.items():
        save(f"{DATA_DIR}/cell_2d_{name}.png", two.png(cell, 10, None, 0, shape))
        save(f"{DATA_DIR}/cell_2d_{name}_outline.png", two.png(cell, 10, RED, 1, shape))

if __name__ == "__main__":
    main()
