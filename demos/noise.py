from mrlypy.core import Rng
from mrlypy.math import two

def print_cell(cell: dict):
    mapping = {0: "⬜️", 1: "⬛️"}
    for row in two.text(cell, mapping):
        print(row)
    print()

def main():
    rng = Rng(42)
    for number in [3, 5, 7]:
        for level in [1, 2]:
            for density in [0.25, 0.5, 0.75]:
                print(f"Number: {number}, Level: {level}, Density: {density}")
                print_cell(two.noise(number, level, density, rng))

if __name__ == "__main__":
    main()
