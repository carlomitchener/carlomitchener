import sys

import lib  # noqa: F401

from PIL import Image, ImageDraw, ImageFont
from mrlypy.six import designs
from mrlypy.six.geometry import radial
from mrlypy.six.renderer import draw
from mrlypy.two import designs as designs_2d
from mrlypy.two.renderer import to_image

from lib.canvas import H3, INK, PAPER, quantize
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

# FRAME

def label(canvas, family):
    try:
        font = ImageFont.load_default(48)
    except TypeError:
        font = ImageFont.load_default()
    ImageDraw.Draw(canvas).text((30, CANVAS - 78), family, fill=INK.to_rgb(), font=font)

def flat_frame(family, number):
    cell = getattr(designs_2d, f"{family}_2d")(number, LEVEL).paint()
    image = to_image(cell, max(1, (CANVAS - STRIP) // cell.height))
    canvas = Image.new("RGB", (CANVAS, CANVAS), PAPER.to_rgb())
    canvas.paste(image, ((CANVAS - image.width) // 2, (CANVAS - STRIP - image.height) // 2), image)
    label(canvas, family)
    return quantize(canvas, COLORS)

def frame(family, projection, number):
    if projection == "flat":
        return flat_frame(family, number)
    cell = getattr(designs, f"{family}_{projection}")(number, LEVEL).paint()
    sheet = radial(cell, RADIUS)
    image = draw(sheet, scale=SCALE, start=1 - cell.start)
    w, h = image.size
    if cell.orientation == "horizontal":
        image = image.resize((w, round(h * H3)), Image.LANCZOS)
    else:
        image = image.resize((round(w * H3), h), Image.LANCZOS)
    image.thumbnail((CANVAS, CANVAS), Image.LANCZOS)
    canvas = Image.new("RGB", (CANVAS, CANVAS), PAPER.to_rgb())
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
