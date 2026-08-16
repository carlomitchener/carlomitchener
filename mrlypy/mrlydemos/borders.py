import mrlytwo as m2
from mrlycore.colors import black, blue, green, red, white
from config import DATA_DIR

def main():
    fp = f"{DATA_DIR}/cell_borders.png"
    cell = m2.carpet_2d(3, 2).pad(1, 2).pad(1, 3).pad(1, 4)
    cell.paint({0: [white], 1: [black], 2: [red], 3: [green], 4: [blue]})
    image = cell.to_image(20)
    image.save(fp)
    print(f"Saved: {fp}")

if __name__ == "__main__":
    main()
