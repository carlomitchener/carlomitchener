import numpy as np
from mrlypy.tile.models import Tile
from mrlypy.two import carpet_2d
from .enums import Edition, Scheme, Type
from .models import Paint
from .randomizer import random_secondary, random_shades

# HELPERS

def remap_tags(p: Paint, tile: Tile) -> int:
    match p.target:
        case Type.FILL:
            type_mask = (tile.cell.types == 0)
        case Type.VOID:
            type_mask = (tile.cell.types == 1)
    relevant_tags = tile.cell.tags[type_mask]
    if relevant_tags.size == 0:
        return 0
    unique_tags = np.unique(relevant_tags)
    new_tags = np.zeros_like(tile.cell.tags)
    for i, t in enumerate(unique_tags):
        new_tags[tile.cell.tags == t] = i
    tile.cell.tags = new_tags
    return len(unique_tags)

def apply_colors(p: Paint, max_val: int) -> Paint:
    match p.scheme:
        case Scheme.MULTICOLOR:
            p.wipe()
            p.secondary = random_secondary(max_val, p.primary)
        case Scheme.MULTITONE:
            p.wipe()
            p.secondary = random_secondary(1, None)
            p.shades = random_shades(max_val, p.primary)
    return p

# LAYERS

def prime_layers(p: Paint, tile: Tile, mask: Tile = None) -> Paint:
    tile.cell.layers()
    max_val = remap_tags(p, tile)
    p = apply_colors(p, max_val)
    return p

# NEIGHBORS

def prime_neighbors(p: Paint, tile: Tile, mask: Tile = None) -> Paint:
    tile.cell.neighbors(mask.cell.types, 1)
    max_val = remap_tags(p, tile)
    p = apply_colors(p, max_val)
    return p

# PRIME

PRIME_FACTORY = {
    Edition.LAYERS: prime_layers,
    Edition.NEIGHBORS: prime_neighbors,
}

def prime(p: Paint, tile: Tile, mask: Tile = None) -> Paint:
    if p.edition not in PRIME_FACTORY:
        return p
    if p.edition == Edition.NEIGHBORS and mask is None:
        mask = Tile(cell=carpet_2d(3))
    return PRIME_FACTORY[p.edition](p, tile, mask)
