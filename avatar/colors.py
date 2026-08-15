import json
import os
from typing import Tuple

# SOURCE

RED_1 = (255, 56, 60)
ORANGE_1 = (255, 141, 40)
YELLOW_1 = (255, 204, 0)
GREEN_1 = (52, 199, 89)
MINT_1 = (0, 200, 179)
TEAL_1 = (0, 195, 208)
CYAN_1 = (0, 192, 232)
BLUE_1 = (0, 136, 255)
INDIGO_1 = (97, 85, 245)
PURPLE_1 = (203, 48, 224)
PINK_1 = (255, 45, 85)
BROWN_1 = (172, 127, 94)
GRAY_1 = (142, 142, 147)

RED_2 = (255, 66, 69)
ORANGE_2 = (255, 146, 48)
YELLOW_2 = (255, 214, 0)
GREEN_2 = (48, 209, 88)
MINT_2 = (0, 218, 195)
TEAL_2 = (0, 210, 224)
CYAN_2 = (60, 211, 254)
BLUE_2 = (0, 145, 255)
INDIGO_2 = (109, 124, 255)
PURPLE_2 = (219, 52, 242)
PINK_2 = (255, 55, 95)
BROWN_2 = (183, 138, 102)
GRAY_2 = (142, 142, 147)

# NAMES

NAMES = ["black", "white", "red", "orange", "yellow", "green", "mint", "teal", "cyan", "blue", "indigo", "purple", "pink", "brown", "gray"]

COLORS_1 = [None, None, RED_1, ORANGE_1, YELLOW_1, GREEN_1, MINT_1, TEAL_1, CYAN_1, BLUE_1, INDIGO_1, PURPLE_1, PINK_1, BROWN_1, GRAY_1]
COLORS_2 = [None, None, RED_2, ORANGE_2, YELLOW_2, GREEN_2, MINT_2, TEAL_2, CYAN_2, BLUE_2, INDIGO_2, PURPLE_2, PINK_2, BROWN_2, GRAY_2]

# RGB

def rgb(name: str) -> Tuple[int, int, int]:
    i = NAMES.index(name)
    if name == "black":
        return (0, 0, 0)
    if name == "white":
        return (255, 255, 255)
    r = int((COLORS_1[i][0] + COLORS_2[i][0]) / 2)
    g = int((COLORS_1[i][1] + COLORS_2[i][1]) / 2)
    b = int((COLORS_1[i][2] + COLORS_2[i][2]) / 2)
    return (r, g, b)

# JSON

def colors_json():
    result = [{"name": name, "r": r, "g": g, "b": b} for name in NAMES for r, g, b in [rgb(name)]]
    data_path = os.path.join(os.path.dirname(__file__), "data", "MrlyColors.json")
    os.makedirs(os.path.dirname(data_path), exist_ok=True)
    with open(data_path, "w") as f:
        json.dump(result, f, indent=2)
    print(f"wrote {os.path.abspath(data_path)}")

# CODEGEN

def _entries():
    return [(name.upper(), rgb(name)) for name in NAMES]

def colors_python():
    lines = []
    for name, (r, g, b) in _entries():
        lines.append(f"{name} = Color({r}, {g}, {b})")
    return "\n".join(lines) + "\n"

def colors_rust():
    lines = []
    for name, (r, g, b) in _entries():
        lines.append(f"pub const {name}: Color = Color::rgb({r}, {g}, {b});")
    return "\n".join(lines) + "\n"

def colors_js():
    lines = []
    for name, (r, g, b) in _entries():
        lines.append(f"export const {name} = [{r}, {g}, {b}, 255];")
    return "\n".join(lines) + "\n"

def colors_code():
    out_dir = os.path.join(os.path.dirname(__file__), "data", "colors")
    os.makedirs(out_dir, exist_ok=True)
    for filename, content in [
        ("colors.py", colors_python()),
        ("colors.rs", colors_rust()),
        ("colors.js", colors_js()),
    ]:
        path = os.path.join(out_dir, filename)
        with open(path, "w") as f:
            f.write(content)
        print(f"wrote {os.path.abspath(path)}")
    colors_json()

if __name__ == "__main__":
    colors_code()
