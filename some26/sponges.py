import math
import sys

from PIL import Image
from mrlypy.core.colors import ALPHA, BLACK, WHITE, gradient
from mrlypy.math import six, three
from mrlypy.math.six import GRID, LEFT, RIGHT, UP

from lib.canvas import H3, PAPER, decode, flatten, quantize
from lib.gif import write_gif
from lib.paths import GIFS, data, ensure, show
from lib.terminal import menu, pick_level, pick_number

SIZE = 1080
SUPER = 3
GIFH = 810
GIFW = round(GIFH * H3)
PAD = 24
GREYS = 16
NUMBERS = [1, 3, 5, 7, 9]
LEVEL = 1
CUBE_CAP = 8 * 1024 ** 2

# SHADES

SHADES = gradient([BLACK, WHITE], 4)
PALETTE = {UP: [SHADES[2]], LEFT: [SHADES[1]], RIGHT: [SHADES[0]], GRID: [ALPHA]}

# SPONGE

def cost(number, level):
    return number ** (3 * level)

def sponge(number, level):
    weight = cost(number, level)
    if weight > CUBE_CAP:
        sys.exit("%d-%d is %d little cubes: six.iso walks every one of them"
                 % (number, level, weight))
    return six.paint(six.iso(three.carpet(number, level)), PALETTE)

# CANVAS

def picture(cell, height):
    scale = max(1, math.ceil(SUPER * height / (six.height(cell) + 2)))
    image = flatten(decode(six.png(cell, scale, None, 0))).convert("L")
    w, h = image.size
    image = image.resize((max(1, round(w * H3)), h), Image.LANCZOS)
    image.thumbnail((round(height * H3), height), Image.LANCZOS)
    return image

# GIF

def frame(cell):
    image = picture(cell, GIFH - 2 * PAD)
    canvas = Image.new("L", (GIFW, GIFH), PAPER[0])
    canvas.paste(image, ((GIFW - image.width) // 2, (GIFH - image.height) // 2))
    return quantize(canvas, GREYS)

# RUN

def draw_one(number, level):
    ensure()
    path = data("sponge-%d-%d.png" % (number, level))
    picture(sponge(number, level), SIZE).save(path, optimize=True)
    print("%s (%d cubes across)" % (show(path), number ** level))
    return 0

def sweep(level):
    ensure()
    frames = []
    for number in NUMBERS:
        frames.append(frame(sponge(number, level)))
        print("sponge %d ready" % number)
    path = GIFS / ("sponges-%d.gif" % level)
    write_gif(path, frames)
    print("%s (%s)" % (show(path), " ".join(str(n) for n in NUMBERS)))
    return 0

# TERMINAL

COMMANDS = {
    "sweep": (sweep, "every number, one frame each, as a gif"),
    "draw": (draw_one, "draw one NUMBER LEVEL"),
}

def help():
    menu("sponges.py <command> <number> <level>   the sponges themselves, corner-on",
         COMMANDS,
         [str(number) for number in NUMBERS],
         f"'sweep' alone draws the lot at level {LEVEL}; add a level to go deeper.")

def terminal():
    match sys.argv[1:]:
        case ["sweep"]:
            sys.exit(sweep(LEVEL) or 0)
        case ["sweep", level]:
            sys.exit(sweep(pick_level(level)) or 0)
        case ["draw", number]:
            sys.exit(draw_one(pick_number(number), LEVEL) or 0)
        case ["draw", number, level]:
            sys.exit(draw_one(pick_number(number), pick_level(level)) or 0)
        case _:
            help()

if __name__ == "__main__":
    terminal()
