import mrlypaint
import mrlytile
from mrlycore.helpers import hex_key, random_seed
from mrlycore.state import seed
from mrlypaint.enums import Edition
from mrlypaint.models import Paint
from mrlypaint.randomizer import random_edition
from mrlytile.models import Tile
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
    v.tile = mrlytile.create(config.tile)
    if v.edition == Edition.NEIGHBORS:
        mask_config = mrlytile.Config(min_size=3, max_size=3)
        v.mask = mrlytile.create(mask_config)
    return v

# GENERATE

def generate(v: Gen) -> Gen:
    v.tile = mrlytile.build(v.tile)
    if v.mask:
        v.mask = mrlytile.build(v.mask)
        pop_center(v.mask)
    if v.is_cover:
        paint_config = mrlypaint.Config(editions=[v.edition], primaries=v.primaries)
        v.paint = mrlypaint.setup(Paint(edition=v.edition), paint_config)
    else:
        paint_config = mrlypaint.Config(editions=[v.edition], primaries=v.primaries)
        v.paint = mrlypaint.paint(v.tile, paint_config, mask=v.mask)
    return v
