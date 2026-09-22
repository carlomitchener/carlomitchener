from config import DATA_DIR
from helpers import save
from mrlypy.core.colors import BLACK, WHITE
from mrlypy.math import two
from mrlypy.math.cell import models, paint

def mrly(number, level, palette):
    mrly_factory = {
        "carpet": two.carpet(number, level),
        "net": two.net(number, level),
        "tree": two.vtree(number, level),
        "void": two.void(number, level),
    }
    for key, value in mrly_factory.items():
        save(f"{DATA_DIR}/mrly_{key}.png", two.png(paint(value, palette), 1, None, 0, "Square"))

def anti(number, level, palette):
    anti_factory = {
        "point": models.fractal(models.invert(two.carpet(number, 1)), level),
        "dust": models.fractal(models.invert(two.net(number, 1)), level),
        "line": models.fractal(models.invert(two.vtree(number, 1)), level),
        "star": models.fractal(models.invert(two.void(number, 1)), level),
    }
    for key, value in anti_factory.items():
        save(f"{DATA_DIR}/anti_{key}.png", two.png(paint(value, palette), 1, None, 0, "Square"))

def main():
    number = 3
    level = 3
    palette = {0: [WHITE], 1: [BLACK]}
    mrly(number, level, palette)
    anti(number, level, palette)

if __name__ == "__main__":
    main()
