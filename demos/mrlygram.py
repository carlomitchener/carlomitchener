import math
import os
import sys
from config import DATA_DIR
from helpers import decode
from mrlypy.core.colors import ALPHA, WHITE, rgb
from mrlypy.math import six, three, two
from mrlypy.math.cell import paint
from mrlypy.math.six import FILL, GRID, VOID
from PIL import Image

# DESIGNS

CUTS = {
    "carpet": three.carpet,
    "net": three.net,
    "tree": three.ztree,
    "void": three.void,
}

FLATS = {
    "carpet": two.carpet,
    "net": two.net,
    "tree": two.vtree,
    "void": two.void,
}

DESIGNS = list(CUTS)

MIN = 1
MAX = 55
NUMBERS = [i for i in range(MIN, MAX + 1, 2)]
LEVEL = 1
CUBE_CAP = 4 * 1024 ** 3

# PAINT

INK = rgb(17, 17, 17)
PAPER = WHITE
HEX_PALETTE = {VOID: [PAPER], FILL: [INK], GRID: [ALPHA]}
FLAT_PALETTE = {0: [PAPER], 1: [INK]}

# CANVAS

DATA = os.path.join(DATA_DIR, "mrlygram")
H3 = math.sqrt(3) / 2
WIDTH = 1080
HEIGHT = round(WIDTH * H3)
SUPER = 3
GIFW = 640
GREYS = 24
DELAY = 260
HOLD = 3000

# CUT

def cost(number, level):
    return (4 * number ** level) ** 3

def guard(design, number, level):
    weight = cost(number, level)
    if weight > CUBE_CAP:
        sys.exit("%s %d-%d needs %.1f GB: six.cut blows the cube up by 4 before slicing it"
                 % (design, number, level, weight / 1e9))

# DRAW

def flatten(image):
    canvas = Image.new("RGB", image.size, PAPER[:3])
    canvas.paste(image, (0, 0), image)
    return canvas

def cut_gram(design, number, level):
    guard(design, number, level)
    cell = six.paint(six.cut(CUTS[design](number, level)), HEX_PALETTE)
    scale = max(1, math.ceil(SUPER * WIDTH / (six.width(cell) + 1)))
    image = flatten(decode(six.png(cell, scale, None, 0)))
    return image.resize((WIDTH, HEIGHT), Image.BOX)

def flat_gram(design, number, level):
    cell = paint(FLATS[design](number, level), FLAT_PALETTE)
    return flatten(decode(two.png(cell, 1, None, 0, "Square"))).resize((WIDTH, WIDTH), Image.BOX)

VIEWS = {
    "cut": cut_gram,
    "flat": flat_gram,
}

# OVERLAY

def overlay(layers):
    canvas = layers[0]
    frames = [canvas]
    for count, layer in enumerate(layers[1:], start=2):
        canvas = Image.blend(canvas, layer, 1 / count)
        frames.append(canvas)
    return frames

# GIF

def quantize(image):
    size = (GIFW, max(1, round(GIFW * image.height / image.width)))
    small = image.convert("L").resize(size, Image.LANCZOS)
    return small.quantize(colors=GREYS, method=Image.MEDIANCUT, dither=Image.Dither.NONE)

def write_gif(path, frames):
    frames[0].save(
        path,
        save_all=True,
        append_images=frames[1:],
        duration=[DELAY] * (len(frames) - 1) + [HOLD],
        loop=0,
        optimize=True,
    )

# RUN

def run(view, design, level=LEVEL):
    folder = os.path.join(DATA, "%s-%s-%d" % (view, design, level))
    os.makedirs(folder, exist_ok=True)
    layers = [VIEWS[view](design, number, level) for number in NUMBERS]
    frames = overlay(layers)
    for index, (number, frame) in enumerate(zip(NUMBERS, frames)):
        path = os.path.join(folder, "%s-%s-%03d-%03d.png" % (view, design, index, number))
        frame.save(path, optimize=True)
    print("saved %d frames to %s" % (len(frames), folder))
    gif = os.path.join(DATA, "%s-%s-%d.gif" % (view, design, level))
    write_gif(gif, [quantize(frame) for frame in frames])
    print("saved %s  %.1f MB" % (gif, os.path.getsize(gif) / 1e6))
    print("  %d grams, %d to %d, overlaid at %dx%d" % (len(frames), MIN, NUMBERS[-1], *frames[0].size))
    return 0

def cut_run(design, level=LEVEL):
    return run("cut", design, level)

def flat_run(design, level=LEVEL):
    return run("flat", design, level)

def sweep(level=LEVEL):
    for view in VIEWS:
        for design in DESIGNS:
            print("== %s %s ==" % (view, design))
            run(view, design, level)
            print()
    return 0

def pick(design, level):
    if design not in CUTS:
        sys.exit("'%s' must be one of: %s" % (design, ", ".join(DESIGNS)))
    if not level.isdigit() or int(level) < 1:
        sys.exit("'%s' must be an integer >= 1" % level)
    return design, int(level)

# TERMINAL

COMMANDS = {
    "sweep": (sweep, "every view and design, frames and gif"),
    "cut": (cut_run, "the diagonal slice, as triangles: DESIGN [LEVEL]"),
    "flat": (flat_run, "the rule in 2D, as squares: DESIGN [LEVEL]"),
}

def help():
    width = max(len(name) for name in COMMANDS)
    print("mrlygram.py <command> <design> <level>   stack every number on top of every other")
    print()
    for name, (_, blurb) in COMMANDS.items():
        print("  %-*s  %s" % (width, name, blurb))
    print()
    print("  designs: %s" % ", ".join(DESIGNS))
    print("  numbers: %d to %d odd (%d of them) at level %d" % (MIN, NUMBERS[-1], len(NUMBERS), LEVEL))
    print()
    print("'sweep' draws the lot; 'cut' and 'flat' take one design and any level.")

def terminal():
    match sys.argv[1:]:
        case ["sweep"]:
            sys.exit(sweep() or 0)
        case ["sweep", level]:
            sys.exit(sweep(pick("carpet", level)[1]) or 0)
        case [("cut" | "flat") as view, design]:
            sys.exit(run(view, *pick(design, str(LEVEL))) or 0)
        case [("cut" | "flat") as view, design, level]:
            sys.exit(run(view, *pick(design, level)) or 0)
        case _:
            help()

if __name__ == "__main__":
    terminal()
