import mrlytwo as m2
import numpy as np

def from_list():
    python_list = [
        [0, 1, 1],
        [1, 0, 1],
        [1, 1, 0]
    ]
    cell = m2.Cell2d.from_list(python_list)
    cell = cell.fractal(2).paint()
    cell.to_image(scale=10).show()

def from_array():
    numpy_array = np.array([
        [0, 1, 1],
        [1, 0, 1],
        [1, 1, 0]
    ])
    cell = m2.Cell2d.from_array(numpy_array)
    cell = cell.fractal(3).paint()
    cell.to_image(scale=10).show()

if __name__ == "__main__":
    from_list()
    from_array()
