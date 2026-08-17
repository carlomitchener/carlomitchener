import lib  # noqa: F401 — lib/__init__.py puts mrlypy on sys.path

from PIL import Image, ImageDraw, ImageFont

from lib.canvas import INK, PAPER, quantize
from lib.gif import write_gif
from lib.paths import FILES, GIFS, ensure, show

IMAGES = FILES / "old" / "images"
NUMBERS = [0, 3, 5, 7, 9]
SIZE = 810
STRIP = 110
GREYS = 16

# FRAME

def label(canvas, name):
    try:
        font = ImageFont.load_default(48)
    except TypeError:
        font = ImageFont.load_default()
    ImageDraw.Draw(canvas).text((30, SIZE - 78), name, fill=INK.r, font=font)

def frame(number):
    name = "MrlyGram-%d" % number
    image = Image.open(IMAGES / (name + ".png")).convert("L")
    image.thumbnail((SIZE, SIZE - STRIP), Image.LANCZOS)
    canvas = Image.new("L", (SIZE, SIZE), PAPER.r)
    canvas.paste(image, ((SIZE - image.width) // 2, (SIZE - STRIP - image.height) // 2))
    label(canvas, name)
    return quantize(canvas, GREYS)

# RUN

def main():
    ensure()
    path = GIFS / "challenge.gif"
    write_gif(path, [frame(number) for number in NUMBERS])
    print("%s (%s)" % (show(path), " ".join("MrlyGram-%d" % n for n in NUMBERS)))

if __name__ == "__main__":
    main()
