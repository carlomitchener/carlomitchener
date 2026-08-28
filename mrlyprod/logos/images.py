import mrlypy.two as m2
from mrlypy.core.colors import black, white
from mrlypy.core.enums import Mode
import os
from letters import mrlyprod

MAPPING = {0: [white], 1: [black]}
MODE = Mode.TYPE
BANNER_SIZE = (16, 9)
ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUTPUT_DIR = f"{ROOT_DIR}/data/logos"
LOGO_SCALE = 200
GRID_SCALE = 32
TEXT_SCALE = 50

def create_logo_png():
    fp = f"{OUTPUT_DIR}/mrlylogo.png"
    cell = m2.carpet_2d(5)
    cell = cell.paint(MAPPING, MODE)
    img = cell.to_image(LOGO_SCALE)
    img.save(fp)
    print(f"Saved: {fp}")

def create_logo_svg():
    fp = f"{OUTPUT_DIR}/mrlylogo.svg"
    cell = m2.carpet_2d(5)
    cell = cell.paint(MAPPING, MODE)
    svg = cell.svg_square(LOGO_SCALE)
    with open(fp, "w") as f:
        f.write(svg)
    print(f"Saved: {fp}")

def create_grid_png():
    fp = f"{OUTPUT_DIR}/mrlygrid.png"
    cell = m2.carpet_2d(5)
    cell = cell.paint(MAPPING, MODE)
    cell = cell.tile(BANNER_SIZE[0], BANNER_SIZE[1])
    img = cell.to_image(GRID_SCALE)
    img.save(fp)
    print(f"Saved: {fp}")

def create_grid_svg():
    fp = f"{OUTPUT_DIR}/mrlygrid.svg"
    cell = m2.carpet_2d(5)
    cell = cell.paint(MAPPING, MODE)
    cell = cell.tile(BANNER_SIZE[0], BANNER_SIZE[1])
    svg = cell.svg_square(GRID_SCALE)
    with open(fp, "w") as f:
        f.write(svg)
    print(f"Saved: {fp}")

def get_text_cell(padding: int = 1):
    grid_width = 47 + (padding * 2)
    grid_height = 5 + (padding * 2)
    grid = [list("0" * grid_width) for _ in range(grid_height)]
    for letter_idx, letter in enumerate(mrlyprod):
        x_offset = padding + letter_idx * 6
        for row_idx, row in enumerate(letter):
            for col_idx, bit in enumerate(row):
                grid[row_idx + padding][x_offset + col_idx] = bit
    string_data = ["".join(row) for row in grid]
    cell = m2.Cell2d.from_strings(string_data)
    return cell.paint(MAPPING, MODE)

def create_text_png():
    fp = f"{OUTPUT_DIR}/mrlyprod.png"
    cell = get_text_cell()
    img = cell.to_image(TEXT_SCALE)
    img.save(fp)
    print(f"Saved: {fp}")

def create_text_svg():
    fp = f"{OUTPUT_DIR}/mrlyprod.svg"
    cell = get_text_cell()
    svg = cell.svg_square(TEXT_SCALE)
    with open(fp, "w") as f:
        f.write(svg)
    print(f"Saved: {fp}")

def main():
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    create_logo_png()
    create_logo_svg()
    create_grid_png()
    create_grid_svg()
    create_text_png()
    create_text_svg()

if __name__ == "__main__":
    main()
