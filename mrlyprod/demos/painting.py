import mrlypy.two as m2
from mrlypy.core.colors import gradient
from mrlypy.core.enums import Mode
from mrlypy.core.state import seed
from colors import *

def main():
    design = m2.carpet_2d
    scale = 33
    number = 55
    steps = 77
    seed(99)
    primaries = [black, white]
    secondaries = [red, orange, yellow, green, mint, teal, cyan, blue, indigo, purple, pink, brown, gray]
    secondaries = gradient(secondaries, steps)
    PAINT_MAP = {0: primaries, 1: secondaries}
    def new_cell():
        return design(number)
    new_cell().paint(PAINT_MAP, Mode.ENUMERATE).to_image(scale).save("data/enumerate.png")
    new_cell().paint(PAINT_MAP, Mode.INDEX).to_image(scale).save("data/index.png")
    new_cell().paint(PAINT_MAP, Mode.ROW).to_image(scale).save("data/row.png")
    new_cell().paint(PAINT_MAP, Mode.COLUMN).to_image(scale).save("data/column.png")
    new_cell().paint(PAINT_MAP, Mode.RANDOM).to_image(scale).save("data/random.png")
    new_cell().layers().paint(PAINT_MAP, Mode.TAG).to_image(scale).save("data/layers.png")
    new_cell().neighbors(new_cell().types).paint(PAINT_MAP, Mode.TAG).to_image(scale).save("data/neighbors.png")

if __name__ == "__main__":
    main()
