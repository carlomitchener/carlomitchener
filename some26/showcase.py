import os
import sys

# ARCHIVE

HERE = os.path.dirname(os.path.abspath(__file__))
ARCHIVE = os.path.normpath(os.path.join(HERE, "..", "archive"))

if not os.path.isdir(os.path.join(ARCHIVE, "mrlysix")):
    sys.exit(f"missing mrlysix: expected the archive at {ARCHIVE}")

sys.path.insert(0, ARCHIVE)

from PIL import Image, ImageDraw, ImageFont
from mrlysix import designs
from mrlysix.geometry import radial
from mrlysix.renderer import draw
from mrlytwo import designs as designs_2d
from mrlytwo.renderer import to_image

NUMBERS = [3, 5, 7]
LEVEL = 2
RADIUS = 2
SCALE = 10
CANVAS = 810
COLORS = 64
DELAY = 1500
H3 = 0.8660254
STRIP = 110
FAMILIES = ["carpet", "net", "tree", "void"]
VIEWS = ["flat", "iso", "pro", "cut"]

# FRAME

def label(canvas, family):
    try:
        font = ImageFont.load_default(48)
    except TypeError:
        font = ImageFont.load_default()
    ImageDraw.Draw(canvas).text((30, CANVAS - 78), family, fill=(17, 17, 17), font=font)

def flat_frame(family, number):
    cell = getattr(designs_2d, f"{family}_2d")(number, LEVEL).paint()
    image = to_image(cell, max(1, (CANVAS - STRIP) // cell.height))
    canvas = Image.new("RGB", (CANVAS, CANVAS), (255, 255, 255))
    canvas.paste(image, ((CANVAS - image.width) // 2, (CANVAS - STRIP - image.height) // 2), image)
    label(canvas, family)
    return canvas.quantize(colors=COLORS, method=Image.MEDIANCUT, dither=Image.Dither.NONE)

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
    canvas = Image.new("RGB", (CANVAS, CANVAS), (255, 255, 255))
    canvas.paste(image, ((CANVAS - image.width) // 2, (CANVAS - image.height) // 2), image)
    label(canvas, family)
    return canvas.quantize(colors=COLORS, method=Image.MEDIANCUT, dither=Image.Dither.NONE)

# SHEETS

def ready():
    os.chdir(HERE)
    os.makedirs("files", exist_ok=True)

def sheets(projection, numbers):
    for number in numbers:
        frames = [frame(family, projection, number) for family in FAMILIES]
        path = f"files/showcase-{projection}-{number}.gif"
        frames[0].save(
            path,
            save_all=True,
            append_images=frames[1:],
            duration=DELAY,
            loop=0,
            optimize=True,
        )
        print(f"{path} ({' '.join(FAMILIES)})")
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
    width = max(len(name) for name in COMMANDS)
    print(f"showcase.py <command> <number>   {' '.join(FAMILIES)} at level {LEVEL}")
    print()
    for name, (_, blurb) in COMMANDS.items():
        print(f"  {name:<{width}}  {blurb}")
    print()
    for number in NUMBERS:
        print(f"  {number}")
    print()
    print("a command alone sweeps every number; add a number to draw just that one.")

def terminal():
    match sys.argv[1:]:
        case [cmd] if cmd in COMMANDS:
            ready()
            sys.exit(COMMANDS[cmd][0](NUMBERS) or 0)
        case [cmd, token] if cmd in COMMANDS:
            ready()
            sys.exit(COMMANDS[cmd][0](pick(token)) or 0)
        case _:
            help()

if __name__ == "__main__":
    terminal()
