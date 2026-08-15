# /// script
# requires-python = ">=3.11"
# dependencies = ["pillow"]
# ///

import os
from PIL import Image

DIR = os.path.dirname(os.path.abspath(__file__))
SOURCE = os.path.join(DIR, "files", "TheBird-Official.png")
FILES_DIR = os.path.join(DIR, "files")

LOGO = (1000, 1000)
WALL = (1920, 1080)
TILES = (16, 9)

# HELPERS

def resize(image, size):
    return image.resize(size, resample=Image.Resampling.LANCZOS)

def tile(image, columns, rows):
    width, height = image.size
    canvas = Image.new("RGBA", (width * columns, height * rows))
    for y in range(rows):
        for x in range(columns):
            canvas.paste(image, (x * width, y * height))
    return canvas

def save(image, name):
    fp = os.path.join(FILES_DIR, name)
    image.save(fp)
    print(f"Saved: {fp}")

# LOGO

def logo():
    image = Image.open(SOURCE).convert("RGBA")
    save(resize(image, LOGO), "carlomitchener.png")
    columns, rows = TILES
    unit = resize(image, (WALL[0] // columns, WALL[1] // rows))
    save(tile(unit, columns, rows).convert("RGB"), "carlomitchener.jpg")

def main():
    logo()

if __name__ == "__main__":
    main()
