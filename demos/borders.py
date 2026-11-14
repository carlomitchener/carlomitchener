from config import DATA_DIR
from helpers import save
from mrly.core.colors import BLACK, BLUE, GREEN, RED, WHITE
from mrly.math import two
from mrly.math.cell import models, paint

def main():
    cell = models.pad(models.pad(models.pad(two.carpet(3, 2), 1, 2), 1, 3), 1, 4)
    cell = paint(cell, {0: [WHITE], 1: [BLACK], 2: [RED], 3: [GREEN], 4: [BLUE]})
    save(f"{DATA_DIR}/cell_borders.png", two.image(cell, 20, None, 0, "Square"))

if __name__ == "__main__":
    main()
