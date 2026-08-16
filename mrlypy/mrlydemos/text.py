import mrlytwo as m2
from config import DATA_DIR

def main():
    cell = m2.carpet_2d(5, 2)
    mapping = {0: "⬜️", 1: "⬛️"}
    data = cell.text(mapping)
    fp = f"{DATA_DIR}/cell_2d.txt"
    for row in data:
        print(row)
    with open(fp, "w") as f:
        for row in data:
            f.write(row + "\n")
    print(f"Saved: {fp}")

if __name__ == "__main__":
    main()
