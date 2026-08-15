import os
import sys

# ARCHIVE

HERE = os.path.dirname(os.path.abspath(__file__))
ARCHIVE = os.path.normpath(os.path.join(HERE, "..", "archive"))

if not os.path.isdir(os.path.join(ARCHIVE, "mrlysix")):
    sys.exit(f"missing mrlysix: expected the archive at {ARCHIVE}")

sys.path.insert(0, ARCHIVE)

import math
import re
from PIL import Image
from mrlycore import binary, formulas
from mrlycore.colors import Color, alpha
from mrlysix import FILL, GRID, VOID
from mrlysix.designs import carpet_cut
from mrlysix.renderer import draw, svg
from mrlytwo.renderer import svg_square, to_image

INK = Color(17, 17, 17)
PAPER = Color(255, 255, 255)
H3 = math.sqrt(3) / 2
SIZE = 1080
SUPER = 3
GIFW = 810
GIFH = round(GIFW * H3)
GIFSQ = GIFW * 2 // 3
GREYS = 16
DELAY = 1500
NUMBERS = [1, 3, 5, 7, 9]
DEPTH = 2
LEVELS = {1: 3, 3: 3, 5: 3}
SVG_CAP = 120000
CUBE_CAP = 4 * 1024 ** 3
GLYPHS = {VOID: "0", FILL: "1", GRID: "-"}
PALETTE = {VOID: [PAPER], FILL: [INK], GRID: [alpha]}

# CUT

def depth(number):
    return LEVELS.get(number, DEPTH)

def cost(number, level):
    return (4 * number ** level) ** 3

def cut(number, level):
    weight = cost(number, level)
    if weight > CUBE_CAP:
        sys.exit("%d-%d needs %.1f GB: mrlysix.cut blows the cube up by 4 before slicing it"
                 % (number, level, weight / 1e9))
    return carpet_cut(number, level).paint(PALETTE)

# CANVAS

def flatten(image):
    canvas = Image.new("RGB", image.size, PAPER.to_rgb())
    canvas.paste(image, (0, 0), image)
    return canvas

def save_png(path, image):
    image.convert("L").save(path, optimize=True)

# TRIANGLES

def triangles(cell, width):
    scale = max(1, math.ceil(SUPER * width / (cell.width + 1)))
    image = flatten(draw(cell, scale=scale, start=cell.start))
    height = max(1, round(width * image.height * H3 / image.width))
    return image.resize((width, height), Image.BOX)

def png_tri(path, cell):
    save_png(path, triangles(cell, SIZE))

def equilateral(markup):
    lines = markup.split("\n")
    if len(lines) < 3:
        return markup
    head, body = lines[0], lines[1:-1]
    width = int(re.search(r'width="(\d+)"', head).group(1))
    height = int(re.search(r'height="(\d+)"', head).group(1)) * H3
    box = '<svg width="%.3f" height="%.3f" viewBox="0 0 %.3f %.3f" xmlns="http://www.w3.org/2000/svg">'
    return "\n".join(
        [box % (width, height, width, height), '<g transform="scale(1,%.7f)">' % H3]
        + body
        + ["</g>", "</svg>"]
    )

def svg_tri(path, cell):
    write(path, equilateral(svg(cell, scale=1, start=cell.start)))

# SQUARES

def png_sq(path, cell):
    image = flatten(to_image(cell.cell))
    height = max(1, round(SIZE * image.height / image.width))
    save_png(path, image.resize((SIZE, height), Image.NEAREST))

def svg_sq(path, cell):
    write(path, svg_square(cell.cell))

# GIF

def frame(cell):
    image = triangles(cell, GIFW).convert("L")
    image.thumbnail((GIFW, GIFH), Image.BOX)
    canvas = Image.new("L", (GIFW, GIFH), PAPER.r)
    canvas.paste(image, ((GIFW - image.width) // 2, (GIFH - image.height) // 2))
    return canvas.quantize(colors=GREYS, method=Image.MEDIANCUT, dither=Image.Dither.NONE)

def frame_sq(cell):
    image = flatten(to_image(cell.cell)).convert("L")
    height = max(1, round(GIFW * image.height / image.width))
    image = image.resize((GIFW, height), Image.NEAREST)
    canvas = Image.new("L", (GIFW, GIFSQ), PAPER.r)
    canvas.paste(image, (0, (GIFSQ - height) // 2))
    return canvas.quantize(colors=GREYS, method=Image.MEDIANCUT, dither=Image.Dither.NONE)

def write_gif(path, frames):
    frames[0].save(
        path,
        save_all=True,
        append_images=frames[1:],
        duration=DELAY,
        loop=0,
        optimize=True,
    )

# TEXT

def write(path, body):
    with open(path, "w") as f:
        f.write(body if body.endswith("\n") else body + "\n")

def write_txt(path, cell):
    write(path, "\n".join(cell.text(GLYPHS)))

def preview(cell):
    rows = cell.text({VOID: " ", FILL: "█", GRID: " "})
    step = max(1, round(cell.height / 31))
    stride = max(1, round(step * 2 * H3))
    for row in rows[::step]:
        print(row[::stride].rstrip())

# RUN

def stats(number, level, cell):
    fills = int((cell.types == FILL).sum())
    print("sponge %d level %d: %d triangles in the cut" % (number, level, fills))
    print("closed form says %d" % formulas.carpet_fill_triangles(number, level))
    if number >= 3:
        seed = int(binary.carpet_3d(number).sum())
        print("dimension log(%d)/log(%d) = %.4f"
              % (seed, number, formulas.carpet_3d_dimension(number)))

def one(number, level, cell):
    stem = "files/cut-%d-%d" % (number, level)
    grid = "files/grid-%d-%d" % (number, level)
    write_txt(stem + ".txt", cell)
    png_tri(stem + ".png", cell)
    png_sq(grid + ".png", cell)
    count = cell.width * cell.height
    if count <= SVG_CAP:
        svg_tri(stem + ".svg", cell)
        svg_sq(grid + ".svg", cell)
    else:
        print("skipped svg for %s: %d cells" % (stem, count))

def ready():
    os.chdir(HERE)
    os.makedirs("files", exist_ok=True)

def draw_one(number, level):
    ready()
    cell = cut(number, level)
    preview(cell)
    one(number, level, cell)
    stats(number, level, cell)
    return 0

def sweep():
    ready()
    cells = {}
    for number in NUMBERS:
        for level in range(1, depth(number) + 1):
            cells[(number, level)] = cut(number, level)
            print("grid %d-%d ready" % (number, level))
    frames = {}
    squares = {}
    for (number, level), cell in sorted(cells.items()):
        one(number, level, cell)
        frames[(number, level)] = frame(cell)
        squares[(number, level)] = frame_sq(cell)
        print("drew %d-%d" % (number, level))
    for number in NUMBERS:
        story = [frames[(number, l)] for l in range(1, depth(number) + 1)]
        if number != 1:
            story.insert(0, frames[(1, 1)])  # level 0: the solid cube
        write_gif("files/cut-levels-%d.gif" % number, story)
    deepest = max(depth(n) for n in NUMBERS)
    for level in range(1, deepest + 1):
        write_gif("files/cut-numbers-%d.gif" % level,
                  [frames[(n, level)] for n in NUMBERS if depth(n) >= level])
        write_gif("files/grid-numbers-%d.gif" % level,
                  [squares[(n, level)] for n in NUMBERS if depth(n) >= level])
    print("wrote %d gifs" % (len(NUMBERS) + 2 * deepest))
    return 0

def pick(number, level):
    if not number.isdigit() or int(number) < 1 or int(number) % 2 == 0:
        sys.exit(f"'{number}' must be odd and positive")
    if not level.isdigit() or int(level) < 1:
        sys.exit(f"'{level}' must be an integer >= 1")
    return int(number), int(level)

# TERMINAL

COMMANDS = {
    "sweep": (sweep, "every number at its level, then the gifs"),
    "draw": (draw_one, "draw one NUMBER LEVEL"),
}

def help():
    width = max(len(name) for name in COMMANDS)
    print("cut.py <command> <number> <level>   slice a generalized Menger sponge")
    print()
    for name, (_, blurb) in COMMANDS.items():
        print(f"  {name:<{width}}  {blurb}")
    print()
    for number in NUMBERS:
        print(f"  {number} to level {depth(number)}")
    print()
    print("'sweep' alone draws the lot; 'draw' takes any odd number and any level.")

def terminal():
    match sys.argv[1:]:
        case ["sweep"]:
            sys.exit(sweep() or 0)
        case ["draw", number, level]:
            sys.exit(draw_one(*pick(number, level)) or 0)
        case _:
            help()

if __name__ == "__main__":
    terminal()
