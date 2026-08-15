import mrlytwo as m2
from mrlycore.colors import blue, gradient, green, red
import numpy as np
from config import DATA_DIR, IMAGE_SIZE

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
    cell = m2.Cell2d.from_array(grid)
    start = red
    mid = green
    end = blue
    colors = gradient([start, mid, end], MAX_ITER)
    palette = np.array([c.to_rgba() for c in colors], dtype=np.uint8)
    grid_clipped = np.clip(grid, 0, MAX_ITER - 1)
    cell.colors = palette[grid_clipped]
    fp = f"{DATA_DIR}/mandelbrot.png"
    image = cell.to_image(scale=10)
    image.save(fp)
    print(f"Saved: {fp}")

if __name__ == "__main__":
    main()
