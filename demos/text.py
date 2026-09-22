from config import DATA_DIR
from mrlypy.math import two

def main():
    cell = two.carpet(5, 2)
    mapping = {0: "⬜️", 1: "⬛️"}
    data = two.text(cell, mapping)
    fp = f"{DATA_DIR}/cell_2d.txt"
    for row in data:
        print(row)
    with open(fp, "w") as f:
        for row in data:
            f.write(row + "\n")
    print(f"Saved: {fp}")

if __name__ == "__main__":
    main()
