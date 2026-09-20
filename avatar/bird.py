import os
from types import SimpleNamespace
from PIL import Image, ImageChops, ImageDraw
from render import BIRD, LAYERS, render

DIR = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(DIR))
SOURCE = os.path.join(DIR, "files", "TheBird-Official.png")
FILES_DIR = os.path.join(DIR, "files")
MARKS_DIR = os.path.join(ROOT, "carlomitchener", "site", "public", "bird")

SIZES = [32, 64, 128, 180, 192, 512, 1024]
THEME_SIZES = [128, 256]
RENDER = 1024
TOUCH = 180
THRESHOLD = 24
MARGIN = 0.04
SUPERSAMPLE = 4

LOGO = (1000, 1000)
WALL = (1920, 1080)
TILES = (16, 9)

# HELPERS

def resize(image, size):
    return image.resize(size, resample=Image.Resampling.LANCZOS)

def save(image, directory, name, **kwargs):
    path = os.path.join(directory, name)
    image.save(path, **kwargs)
    print(f"{os.path.relpath(path, ROOT)}  {os.path.getsize(path)} bytes")

# CROP

def bounds(image):
    ground = Image.new("RGB", image.size, (0, 0, 0))
    lit = ImageChops.difference(image.convert("RGB"), ground).convert("L")
    return lit.point(lambda v: 255 if v > THRESHOLD else 0).getbbox()

def box(image):
    left, top, right, bottom = bounds(image)
    side = max(right - left, bottom - top) * (1 + 2 * MARGIN)
    x = (left + right) / 2
    y = (top + bottom) / 2
    print(f"bird bbox {(left, top, right, bottom)} -> crop side {round(side)}")
    return (round(x - side / 2), round(y - side / 2), round(x + side / 2), round(y + side / 2))

def square(image):
    return image.crop(box(image))

# MASK

def circle(size):
    big = size * SUPERSAMPLE
    mask = Image.new("L", (big, big), 0)
    ImageDraw.Draw(mask).ellipse((0, 0, big - 1, big - 1), fill=255)
    return resize(mask, (size, size))

def round_off(image, size):
    tile = resize(image, (size, size)).convert("RGBA")
    mask = ImageChops.multiply(tile.getchannel("A"), circle(size))
    tile.putalpha(mask)
    return tile

# MARKS

def marks():
    os.makedirs(MARKS_DIR, exist_ok=True)
    crop = square(Image.open(SOURCE).convert("RGBA"))
    for size in SIZES:
        save(round_off(crop, size), MARKS_DIR, f"bird-{size}.png", optimize=True)
    save(resize(crop, (TOUCH, TOUCH)).convert("RGB"), MARKS_DIR, f"square-{TOUCH}.png", optimize=True)

# THEMES

def rendered(theme):
    return render(SimpleNamespace(size=RENDER, theme=theme, bird=None, background=None, layers=set(LAYERS), glow=[True] * len(BIRD["glow"]), crop=False))

def themes():
    dark = rendered("dark")
    window = box(dark)
    for theme, image in [("dark", dark), ("light", rendered("light"))]:
        crop = image.crop(window)
        for size in THEME_SIZES:
            save(round_off(crop, size), MARKS_DIR, f"mark-{theme}-{size}.png", optimize=True)

# LOGO

def tile(image, columns, rows):
    width, height = image.size
    canvas = Image.new("RGBA", (width * columns, height * rows))
    for y in range(rows):
        for x in range(columns):
            canvas.paste(image, (x * width, y * height))
    return canvas

def logo():
    image = Image.open(SOURCE).convert("RGBA")
    save(resize(image, LOGO), FILES_DIR, "carlomitchener.png")
    columns, rows = TILES
    unit = resize(image, (WALL[0] // columns, WALL[1] // rows))
    save(tile(unit, columns, rows).convert("RGB"), FILES_DIR, "carlomitchener.jpg")

def main():
    marks()
    themes()
    logo()

if __name__ == "__main__":
    main()
