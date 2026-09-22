from config import DATA_DIR
from helpers import save
from mrlypy.core.colors import BLACK, BLUE, GREEN, RED
from mrlypy.math import two
from mrlypy.math.cell import models, paint

def main():

    def new_cell():
        return two.vtree(7, 1)

    fills = [BLACK]
    voids = [RED, GREEN, BLUE]
    mode = "Enumerate"
    params = ({0: voids, 1: fills}, mode)

    # PAINT

    save(f"{DATA_DIR}/rotations_paint.png", two.png(paint(new_cell(), *params), 10, None, 0, "Square"))

    save(f"{DATA_DIR}/rotations_paint_rotate.png", two.png(models.rotate(paint(new_cell(), *params), 90), 10, None, 0, "Square"))

    save(f"{DATA_DIR}/rotations_rotate_paint.png", two.png(paint(models.rotate(new_cell(), 90), *params), 10, None, 0, "Square"))

if __name__ == "__main__":
    main()
