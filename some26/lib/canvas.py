import math
from io import BytesIO

from PIL import Image
from mrlypy.core.colors import named

H3 = math.sqrt(3) / 2
INK = named("black")
PAPER = named("white")

def decode(png):
    return Image.open(BytesIO(png)).convert("RGBA")

def flatten(image, background=PAPER):
    canvas = Image.new("RGB", image.size, background[:3])
    canvas.paste(image, (0, 0), image)
    return canvas

def quantize(image, colors):
    return image.quantize(colors=colors, method=Image.MEDIANCUT, dither=Image.Dither.NONE)
