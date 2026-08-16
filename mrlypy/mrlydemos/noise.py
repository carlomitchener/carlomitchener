import mrlytwo as m2
from mrlycore.state import seed

def print_cell(cell: m2.Cell2d):
    mapping = {0: "⬜️", 1: "⬛️"}
    for row in cell.text(mapping):
        print(row)
    print()

def main():
    seed(42)
    for number in [3, 5, 7]:
        for level in [1, 2]:
            for density in [0.25, 0.5, 0.75]:
                print(f"Number: {number}, Level: {level}, Density: {density}")
                print_cell(m2.noise_2d(number, level, density))

if __name__ == "__main__":
    main()
