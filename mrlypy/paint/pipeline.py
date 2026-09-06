from mrlypy.tile.models import Tile
from .config import Config
from .models import Paint
from .painter import apply, setup
from .primer import prime
from .randomizer import random_edition

def paint(tile: Tile, config: Config, mask: Tile = None) -> Paint:
    edition = random_edition(config.editions)
    p = Paint(edition=edition)
    p = setup(p, config)
    p = prime(p, tile, mask)
    apply(p, tile)
    return p
