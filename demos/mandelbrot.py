import numpy as np
from config import DATA_DIR, IMAGE_SIZE
from helpers import save
from mrlypy.core.colors import BLUE, GREEN, RED, gradient
from mrlypy.math import two
from mrlypy.math.cell import models

RESOLUTION = IMAGE_SIZE
MAX_ITER = 100

def mandelbrot_set(width, height, max_iter=100, x_min=-2.0, x_max=1.0, y_min=-1.5, y_max=1.5):
    x = np.linspace(x_min, x_max, width)
    y = np.linspace(y_min, y_max, height)
    X, Y = np.meshgrid(x, y)
    C = X + 1j * Y
    Z = np.zeros_like(C)
    div_time = np.zeros(Z.shape, dtype=np.int16)
    for i in range(max_iter):
        mask = np.abs(Z) <= 2
        Z[mask] = Z[mask] * Z[mask] + C[mask]
        div_time[mask] = i
    return div_time

def main():
    width, height = RESOLUTION
    grid = mandelbrot_set(width, height, MAX_ITER)
    colors = gradient([RED, GREEN, BLUE], MAX_ITER)
    palette = np.array(colors, dtype=np.uint8)
    grid_clipped = np.clip(grid, 0, MAX_ITER - 1)
    cell = {**models.new(grid.astype(np.uint8)), "colors": palette[grid_clipped]}
    save(f"{DATA_DIR}/mandelbrot.png", two.png(cell, 10, None, 0, "Square"))

if __name__ == "__main__":
    main()
