import math

from PIL import Image
from mrlypy.core.colors import Color

H3 = math.sqrt(3) / 2
INK = Color(17, 17, 17)
PAPER = Color(255, 255, 255)

def flatten(image, background=PAPER):
    canvas = Image.new("RGB", image.size, background.to_rgb())
    canvas.paste(image, (0, 0), image)
    return canvas

def quantize(image, colors):
    return image.quantize(colors=colors, method=Image.MEDIANCUT, dither=Image.Dither.NONE)
