import mrlytwo as m2
import mrlythree as m3
import mrlysix as m6
from mrlycore.colors import black, blue, gray, green, red, white
import os
from PIL import Image

DATA_DIR = "data"
SCALE = 10

LEVELS = [2]
NUMBERS = [5]
DESIGNS = ["carpet", "net", "tree", "void"]

FACTORY = {
    "carpet": [m2.carpet_2d, m3.carpet_3d],
    "net": [m2.net_2d, m3.net_3d],
    "tree": [m2.tree_2d, m3.tree_3d],
    "void": [m2.void_2d, m3.void_3d],
}

HEX = {
    "iso": m6.iso,
    "pro": m6.pro,
    "cut": m6.cut,
}

PALETTE = {0: [white], 1: [black], 2: [gray], 3: [red], 4: [green], 5: [blue]}

OUTPUT = {d: {"2d": [], "iso": [], "pro": [], "cut": []} for d in DESIGNS}

def make_2d(design, number, level):
    cell_2d: m2.Cell2d = FACTORY[design][0](number, level)
    cell_2d.paint(PALETTE)
    img = cell_2d.to_image(SCALE)
    fp = f"{DATA_DIR}/{design}_{number}_{level}.png"
    img.save(fp, format="PNG")
    OUTPUT[design]["2d"].append(fp)

def make_3d(design, number, level):
    cell_3d = FACTORY[design][1](number, level)
    for name, func in HEX.items():
        cell_2d: m2.Cell2d = func(cell_3d)
        cell_2d.paint(PALETTE)
        orientation = "horizontal" if name == "cut" else "vertical"
        start = 0 if name == "cut" else 1
        img = m6.draw(cell_2d, SCALE, orientation, start)
        fp = f"{DATA_DIR}/{design}_{number}_{level}_{name}.png"
        img.save(fp, format="PNG")
        OUTPUT[design][name].append(fp)

def main():
    os.makedirs(DATA_DIR, exist_ok=True)
    for level in LEVELS:
        for number in NUMBERS:
            for design in DESIGNS:
                make_2d(design, number, level)
                make_3d(design, number, level)

if __name__ == "__main__":
    main()
