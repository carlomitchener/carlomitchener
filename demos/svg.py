from config import DATA_DIR
from helpers import save
from mrlypy.core.colors import RED
from mrlypy.math import two
from mrlypy.math.cell import paint

SCALE = 10

def cell_2d():
    cell = paint(two.carpet(3, 2))
    data = two.svg(cell, SCALE, RED, 3, "Square")
    print(data)
    save(f"{DATA_DIR}/cell.svg", data)

def main():
    cell_2d()

if __name__ == "__main__":
    main()
