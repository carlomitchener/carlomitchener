from typing import List
from mrlypy.core.colors import Color, gradient
from mrlypy.core.enums import Mode
from mrlypy.core.state import choice
from mrlypy.tile.models import Tile
from .colors import LEVELS, get_color
from .config import Config
from .enums import Edition, Ink, Scheme, Type
from .models import Paint
from .randomizer import random_primary, random_secondary, random_shades

# SETUP

def setup(p: Paint, config: Config = None) -> Paint:
    config = config or Config()
    colors, shades = (None, None)
    if p.is_simple:
        colors, shades = (1, 1)
    if p.edition == Edition.INDEX:
        colors, shades = (2, 2)
    p.scheme = choice(list(Scheme))
    p.target = config.target or choice(list(Type))
    p.primary = random_primary(config.primaries)
    match p.scheme:
        case Scheme.MULTICOLOR:
            p.secondary = random_secondary(colors, p.primary)
        case Scheme.MULTITONE:
            p.secondary = random_secondary(1, None)
            p.shades = random_shades(shades, p.primary)
    return p

# HELPERS

def get_primary(p: Paint) -> List[Color]:
    return [get_color(p.primary)]

def get_secondary(p: Paint) -> List[Color]:
    colors = [get_color(c) for c in p.secondary]
    if p.scheme == Scheme.MULTITONE:
        c1 = colors[0].lightness(LEVELS[0])
        c2 = colors[0].lightness(LEVELS[1])
        colors = [c1, c2]
        steps = len(p.shades)
        if steps > 2:
            colors = gradient(colors, steps)
        colors = [colors[i] for i in p.shades]
    return colors

# FACTORY

MODE_FACTORY = {
    Edition.SIMPLE: Mode.TYPE,
    Edition.INDEX: Mode.INDEX,
    Edition.LAYERS: Mode.TAG,
    Edition.NEIGHBORS: Mode.TAG,
    Edition.ROWS: Mode.ROW,
    Edition.COLUMNS: Mode.COLUMN,
    Edition.RANDOM: Mode.RANDOM,
}

# APPLY

def apply(p: Paint, tile: Tile) -> Paint:
    primary = get_primary(p)
    secondary = get_secondary(p)
    mode = MODE_FACTORY[p.edition]
    match p.target:
        case Type.FILL:
            mapping = {0: secondary, 1: primary}
        case Type.VOID:
            mapping = {0: primary, 1: secondary}
        case _:
            raise ValueError(f"Invalid target: {p.target}")
    tile.cell.paint(mapping, mode)
    return p
