import numpy as np
from config import DATA_DIR
from helpers import save
from mrlypy.math import two
from mrlypy.math.cell import models, paint

def from_list():
    python_list = [
        [0, 1, 1],
        [1, 0, 1],
        [1, 1, 0]
    ]
    cell = models.new(np.array(python_list, dtype=np.uint8))
    cell = paint(models.fractal(cell, 2))
    save(f"{DATA_DIR}/from_list.png", two.png(cell, 10, None, 0, "Square"))

def from_array():
    numpy_array = np.array([
        [0, 1, 1],
        [1, 0, 1],
        [1, 1, 0]
    ], dtype=np.uint8)
    cell = models.new(numpy_array)
    cell = paint(models.fractal(cell, 3))
    save(f"{DATA_DIR}/from_array.png", two.png(cell, 10, None, 0, "Square"))

if __name__ == "__main__":
    from_list()
    from_array()
