import numpy as np
from typing import List, Optional, Tuple
from .errors import MrlyError
from .palette import PALETTE
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

def ink(name: str) -> Color:
    if name not in PALETTE:
        raise MrlyError(f"Unknown ink {name!r}.")
    return Color(*PALETTE[name])

alpha = Color(0, 0, 0, 0)
black = ink("black")
white = ink("white")
gray = ink("gray")
red = ink("red")
green = ink("green")
blue = ink("blue")
cyan = ink("cyan")
purple = ink("purple")
yellow = ink("yellow")
