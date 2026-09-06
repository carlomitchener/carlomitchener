import mrlypy.paint
import mrlypy.tile
from mrlypy.core.helpers import hex_key, random_seed
from mrlypy.core.state import seed
from mrlypy.paint.enums import Edition
from mrlypy.paint.models import Paint
from mrlypy.paint.randomizer import random_edition
from mrlypy.tile.models import Tile
from .config import Config
from .models import File, Gen

# MASK

def pop_center(tile: Tile):
    center = tile.cell.width // 2
    tile.cell.types[center, center] = 0

# CREATE

def create(config: Config) -> Gen:
    s = random_seed()
    seed(s)
    v = Gen()
    v.key = hex_key()
    v.seed = s
    v.files = [File(w, h) for w, h in config.files]
    v.edition = random_edition(config.paint.editions)
    v.primaries = config.paint.primaries
    v.tile = mrlypy.tile.create(config.tile)
    if v.edition == Edition.NEIGHBORS:
        mask_config = mrlypy.tile.Config(min_size=3, max_size=3)
        v.mask = mrlypy.tile.create(mask_config)
    return v

# GENERATE

def generate(v: Gen) -> Gen:
    v.tile = mrlypy.tile.build(v.tile)
    if v.mask:
        v.mask = mrlypy.tile.build(v.mask)
        pop_center(v.mask)
    if v.is_cover:
        paint_config = mrlypy.paint.Config(editions=[v.edition], primaries=v.primaries)
        v.paint = mrlypy.paint.setup(Paint(edition=v.edition), paint_config)
    else:
        paint_config = mrlypy.paint.Config(editions=[v.edition], primaries=v.primaries)
        v.paint = mrlypy.paint.paint(v.tile, paint_config, mask=v.mask)
    return v
