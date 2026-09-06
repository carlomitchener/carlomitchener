from typing import List
from mrlypy.core.colors import Color, ink
from .enums import Ink

# COLORS

BLACK = ink("black")
WHITE = ink("white")
RED = ink("red")
ORANGE = ink("orange")
YELLOW = ink("yellow")
GREEN = ink("green")
MINT = ink("mint")
TEAL = ink("teal")
CYAN = ink("cyan")
BLUE = ink("blue")
INDIGO = ink("indigo")
PURPLE = ink("purple")
PINK = ink("pink")
BROWN = ink("brown")
GRAY = ink("gray")

LEVELS = [33, 66]

# FACTORY

COLOR_FACTORY = {
    Ink.BLACK: BLACK,
    Ink.WHITE: WHITE,
    Ink.RED: RED,
    Ink.ORANGE: ORANGE,
    Ink.YELLOW: YELLOW,
    Ink.GREEN: GREEN,
    Ink.MINT: MINT,
    Ink.TEAL: TEAL,
    Ink.CYAN: CYAN,
    Ink.BLUE: BLUE,
    Ink.INDIGO: INDIGO,
    Ink.PURPLE: PURPLE,
    Ink.PINK: PINK,
    Ink.BROWN: BROWN,
    Ink.GRAY: GRAY
}

# HELPERS

def get_color(ink: Ink) -> Color:
    return COLOR_FACTORY[ink]

def get_primary_inks(primaries: List[str] = None) -> List[Ink]:
    if not primaries:
        return None
    return [Ink(p) for p in primaries]
