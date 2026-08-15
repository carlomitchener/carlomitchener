import mrlytwo as m2
from mrlycore.colors import red
from config import DATA_DIR

SCALE = 10

def cell_2d():
    fp = f"{DATA_DIR}/cell.svg"
    cell = m2.carpet_2d(3, 2).paint()
    data = cell.svg_square(SCALE, outline=red, width=3)
    print(data)
    with open(fp, "w") as f:
        f.write(data)
    print(f"Saved: {fp}")

def main():
    cell_2d()

if __name__ == "__main__":
    main()
