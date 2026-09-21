import math

import lib  # noqa: F401

from PIL import Image, ImageDraw, ImageFont
from mrlypy.core.colors import alpha
from mrlypy.six import FILL, GRID, VOID
from mrlypy.six.designs import carpet_cut
from mrlypy.six.renderer import draw

from lib.canvas import H3, INK, PAPER, flatten, quantize
from lib.gif import write_gif
from lib.paths import GIFS, ensure, show

NUMBER = 5
LEVEL = 2
SUPER = 3
GIFW = 810
GIFH = round(GIFW * H3)
GREYS = 16
PALETTE = {VOID: [PAPER], FILL: [INK], GRID: [alpha]}

# FRAME

def label(canvas, start):
    try:
        font = ImageFont.load_default(48)
    except TypeError:
        font = ImageFont.load_default()
    ImageDraw.Draw(canvas).text((30, GIFH - 78), f"start={start}", fill=INK.r, font=font)

def frame(cell, start):
    scale = max(1, math.ceil(SUPER * GIFW / (cell.width + 1)))
    image = flatten(draw(cell, scale=scale, start=start)).convert("L")
    height = max(1, round(GIFW * image.height * H3 / image.width))
    image = image.resize((GIFW, height), Image.BOX)
    canvas = Image.new("L", (GIFW, GIFH), PAPER.r)
    canvas.paste(image, ((GIFW - image.width) // 2, (GIFH - image.height) // 2))
    label(canvas, start)
    return quantize(canvas, GREYS)

# RUN

def main():
    ensure()
    cell = carpet_cut(NUMBER, LEVEL).paint(PALETTE)
    path = GIFS / ("start-%d-%d.gif" % (NUMBER, LEVEL))
    write_gif(path, [frame(cell, start) for start in (0, 1)])
    print("%s (start 0, start 1)" % show(path))

if __name__ == "__main__":
    main()
