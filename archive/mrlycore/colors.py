import numpy as np
from typing import List, Optional, Tuple
from .errors import MrlyError
from .state import state

class Color:

    def __init__(
        self,
        r: int = 0,
        g: int = 0,
        b: int = 0,
        a: int = 255
    ):
        self.r = r
        self.g = g
        self.b = b
        self.a = a

    def __repr__(self) -> str:
        return self.to_string()

    def __str__(self) -> str:
        return self.to_string()

    def __eq__(self, other: "Color") -> bool:
        return self.r == other.r and self.g == other.g and self.b == other.b and self.a == other.a

    def __hash__(self) -> int:
        return hash((self.r, self.g, self.b, self.a))

    def to_string(self) -> str:
        if self.a == 255:
            return f"rgb({self.r},{self.g},{self.b})"
        return f"rgba({self.r},{self.g},{self.b},{self.a})"

    def to_dict(self):
        return [self.r, self.g, self.b, self.a]

    @classmethod
    def from_dict(cls, data):
        r, g, b, a = data
        return cls(r, g, b, a)

    @staticmethod
    def rgba_to_hex(r: int, g: int, b: int, a: int) -> str:
        if a == 255:
            return f"#{r:02x}{g:02x}{b:02x}"
        return f"#{r:02x}{g:02x}{b:02x}{a:02x}"

    def to_hex(self) -> str:
        return Color.rgba_to_hex(self.r, self.g, self.b, self.a)

    @classmethod
    def from_hex(cls, hex_code: str, alpha: int = 255) -> "Color":
        hex_code = hex_code.strip("#")
        if len(hex_code) == 8:
            r = int(hex_code[0:2], 16)
            g = int(hex_code[2:4], 16)
            b = int(hex_code[4:6], 16)
            a = int(hex_code[6:8], 16)
            return cls(r, g, b, a)
        elif len(hex_code) == 6:
            r = int(hex_code[0:2], 16)
            g = int(hex_code[2:4], 16)
            b = int(hex_code[4:6], 16)
            return cls(r, g, b, alpha)
        else:
            raise MrlyError("Hex code must be in format #RRGGBB or #RRGGBBAA")

    def to_rgb(self) -> Tuple[int, int, int]:
        return (self.r, self.g, self.b)

    @classmethod
    def from_rgb(cls, r: int, g: int, b: int, alpha: int = 255) -> "Color":
        return cls(r, g, b, alpha)

    def to_rgba(self) -> Tuple[int, int, int, int]:
        return (self.r, self.g, self.b, self.a)

    @classmethod
    def from_rgba(cls, r: int, g: int, b: int, a: int) -> "Color":
        return cls(r, g, b, a)

    def alpha(self, level: int) -> "Color":
        if not 0 <= level <= 255:
            raise MrlyError(f"Level must be between 0 and 255, got {level}")
        return Color(self.r, self.g, self.b, level)

    def invert(self) -> "Color":
        r, g, b, a = 255 - self.r, 255 - self.g, 255 - self.b, self.a
        return Color(r, g, b, a)

    def lightness(self, level: int) -> "Color":
        if not 0 <= level <= 100:
            raise MrlyError(f"Level must be between 0 and 100, got {level}")
        if level == 50:
            r, g, b = self.r, self.g, self.b
        elif level < 50:
            factor = level / 50
            r = int(self.r * factor)
            g = int(self.g * factor)
            b = int(self.b * factor)
        else:
            factor = (level - 50) / 50
            r = int(self.r + (255 - self.r) * factor)
            g = int(self.g + (255 - self.g) * factor)
            b = int(self.b + (255 - self.b) * factor)
        return Color(r, g, b, self.a)

    @classmethod
    def random(cls, alpha: bool = False) -> "Color":
        return cls(
            r=state.rng.randint(0, 256),
            g=state.rng.randint(0, 256),
            b=state.rng.randint(0, 256),
            a=state.rng.randint(0, 256) if alpha else 255,
        )

def mix(color1: Color, color2: Color, ratio: float = 0.5) -> Color:
    if not 0.0 <= ratio <= 1.0:
        raise MrlyError(f"Ratio must be between 0.0 and 1.0, got {ratio}")
    r = int(color1.r + (color2.r - color1.r) * ratio)
    g = int(color1.g + (color2.g - color1.g) * ratio)
    b = int(color1.b + (color2.b - color1.b) * ratio)
    a = int(color1.a + (color2.a - color1.a) * ratio)
    return Color(r, g, b, a)

def gradient(colors: List[Color], steps: int) -> List[Color]:
    if not colors:
        raise MrlyError("Cannot create a gradient from an empty list of colors.")
    if steps < 1:
        raise MrlyError("Steps must be at least 1.")
    if steps == 1:
        return [colors[0]]
    if len(colors) == 1:
        return [colors[0]] * steps
    result = []
    segments = len(colors) - 1
    for i in range(steps):
        pos = i / (steps - 1)
        seg = int(pos * segments)
        if seg >= segments:
            seg = segments - 1
        ratio = (pos * segments) - seg
        start = colors[seg]
        end = colors[seg + 1]
        result.append(mix(start, end, ratio))
    return result

alpha = Color(0, 0, 0, 0)
black = Color(0, 0, 0)
white = Color(255, 255, 255)
gray = Color(128, 128, 128)
red = Color(255, 0, 0)
green = Color(0, 255, 0)
blue = Color(0, 0, 255)
cyan = Color(0, 255, 255)
magenta = Color(255, 0, 255)
yellow = Color(255, 255, 0)

# INKS

INKS = {
    "black": (0, 0, 0),
    "white": (255, 255, 255),
    "gray": (142, 142, 147),
    "red": (255, 59, 48),
    "orange": (255, 149, 0),
    "yellow": (255, 204, 0),
    "green": (52, 199, 89),
    "mint": (0, 199, 190),
    "teal": (48, 176, 199),
    "cyan": (50, 173, 230),
    "blue": (0, 122, 255),
    "indigo": (88, 86, 214),
    "purple": (175, 82, 222),
    "pink": (255, 45, 85),
    "brown": (162, 132, 94),
}

def ink(name: str) -> Color:
    if name not in INKS:
        raise MrlyError(f"Unknown ink {name!r}.")
    return Color(*INKS[name])
