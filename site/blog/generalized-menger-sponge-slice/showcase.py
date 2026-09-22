import sys

from PIL import Image, ImageDraw, ImageFont
from mrlypy.math import six, three, two
from mrlypy.math.cell import models, paint

from lib.canvas import H3, INK, PAPER, decode, quantize
from lib.gif import write_gif
from lib.paths import GIFS, ensure, show
from lib.terminal import menu

NUMBERS = [3, 5, 7]
LEVEL = 2
RADIUS = 2
SCALE = 10
CANVAS = 810
COLORS = 64
STRIP = 110
FAMILIES = ["carpet", "net", "tree", "void"]
VIEWS = ["flat", "iso", "pro", "cut"]
FLATS = {"carpet": two.carpet, "net": two.net, "tree": two.vtree, "void": two.void}
CUBES = {"carpet": three.carpet, "net": three.net, "tree": three.ztree, "void": three.void}
PROJECTIONS = {"iso": six.iso, "pro": six.pro, "cut": six.cut}

# FRAME

def label(canvas, family):
    try:
        font = ImageFont.load_default(48)
    except TypeError:
        font = ImageFont.load_default()
    ImageDraw.Draw(canvas).text((30, CANVAS - 78), family, fill=INK[:3], font=font)

def flat_frame(family, number):
    cell = paint(FLATS[family](number, LEVEL))
    image = decode(two.png(cell, max(1, (CANVAS - STRIP) // models.height(cell)), None, 0, "Square"))
    canvas = Image.new("RGB", (CANVAS, CANVAS), PAPER[:3])
    canvas.paste(image, ((CANVAS - image.width) // 2, (CANVAS - STRIP - image.height) // 2), image)
    label(canvas, family)
    return quantize(canvas, COLORS)

def frame(family, projection, number):
    if projection == "flat":
        return flat_frame(family, number)
    cell = six.paint(PROJECTIONS[projection](CUBES[family](number, LEVEL)))
    sheet = six.radial(cell, RADIUS)
    orientation = six.orientation(models.width(sheet), models.height(sheet))
    sheet = six.new(sheet, cell["projection"], orientation, 1 - cell["start"])
    image = decode(six.png(sheet, SCALE, None, 0))
    w, h = image.size
    if cell["orientation"] == "Horizontal":
        image = image.resize((w, round(h * H3)), Image.LANCZOS)
    else:
        image = image.resize((round(w * H3), h), Image.LANCZOS)
    image.thumbnail((CANVAS, CANVAS), Image.LANCZOS)
    canvas = Image.new("RGB", (CANVAS, CANVAS), PAPER[:3])
    canvas.paste(image, ((CANVAS - image.width) // 2, (CANVAS - image.height) // 2), image)
    label(canvas, family)
    return quantize(canvas, COLORS)

# SHEETS

def sheets(projection, numbers):
    for number in numbers:
        frames = [frame(family, projection, number) for family in FAMILIES]
        path = GIFS / f"showcase-{projection}-{number}.gif"
        write_gif(path, frames)
        print(f"{show(path)} ({' '.join(FAMILIES)})")
    return 0

def flat(numbers):
    return sheets("flat", numbers)

def iso(numbers):
    return sheets("iso", numbers)

def pro(numbers):
    return sheets("pro", numbers)

def cut(numbers):
    return sheets("cut", numbers)

def every(numbers):
    for projection in VIEWS:
        sheets(projection, numbers)
    return 0

def pick(token):
    if not token.isdigit() or int(token) not in NUMBERS:
        sys.exit(f"'{token}' is not in the showcase: " + ", ".join(str(n) for n in NUMBERS))
    return [int(token)]

# TERMINAL

COMMANDS = {
    "all": (every, "every view at every number"),
    "flat": (flat, "the family rule in 2D, before the third axis"),
    "iso": (iso, "the whole sponge, seen isometrically"),
    "pro": (pro, "the three faces the sponge shows you"),
    "cut": (cut, "the diagonal slice through the middle"),
}

def help():
    menu(f"showcase.py <command> <number>   {' '.join(FAMILIES)} at level {LEVEL}",
         COMMANDS,
         [str(number) for number in NUMBERS],
         "a command alone sweeps every number; add a number to draw just that one.")

def terminal():
    match sys.argv[1:]:
        case [cmd] if cmd in COMMANDS:
            ensure()
            sys.exit(COMMANDS[cmd][0](NUMBERS) or 0)
        case [cmd, token] if cmd in COMMANDS:
            ensure()
            sys.exit(COMMANDS[cmd][0](pick(token)) or 0)
        case _:
            help()

if __name__ == "__main__":
    terminal()
