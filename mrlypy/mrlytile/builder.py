import numpy as np
from mrlytwo import carpet_2d, net_2d, tree_2d, void_2d, Cell2d, magic_2d, special_2d, mosaic_2d
from .enums import Design, Group
from .models import Tile

# HELPERS

CELL_FACTORY = {
    Design.CARPET: carpet_2d,
    Design.NET: net_2d,
    Design.TREE: tree_2d,
    Design.VOID: void_2d,
}

def tree_mask(n: int) -> np.ndarray:
    vertical_tree = tree_2d(n).types
    horizontal_tree = np.rot90(vertical_tree)
    mask = np.zeros((n, n), dtype=np.int8)
    mask[(vertical_tree == 1) | (horizontal_tree == 1)] = 1
    mask[(vertical_tree == 1) & (horizontal_tree == 1)] = 2
    return mask

def build_cell(tile: Tile, i: int = 0, level: int = 1) -> Cell2d:
    anti = tile.anti[i] if tile.anti else False
    design = tile.design[i]
    number = tile.number[i]
    rotation = tile.rotation[i]
    cell = CELL_FACTORY[design](number)
    if anti:
        cell.invert()
    if level > 1:
        cell.fractal(level)
    if rotation != 0:
        cell.rotate(rotation)
    return cell

# GROUP BUILDERS

def general_tile(tile: Tile) -> Cell2d:
    return build_cell(tile, 0)

def fractal_tile(tile: Tile) -> Cell2d:
    return build_cell(tile, 0, tile.level[0])

def magic_tile(tile: Tile) -> Cell2d:
    count = len(tile.design)
    cells = [build_cell(tile, i) for i in range(count)]
    return magic_2d(cells)

def special_tile(tile: Tile) -> Cell2d:
    cell = tree_2d(number=tile.number[0])
    mask = CELL_FACTORY[tile.design[0]](tile.mask)
    if tile.rotation[0] != 0:
        mask.rotate(tile.rotation[0])
    if tile.flip:
        mask.invert()
    return special_2d(mask.types, cell)

def mosaic_tile(tile: Tile) -> Cell2d:
    mask = tree_mask(tile.mask)
    cells = [build_cell(tile, i) for i in range(3)]
    return mosaic_2d(mask, cells)

BUILD_FACTORY = {
    Group.GENERAL: general_tile,
    Group.FRACTAL: fractal_tile,
    Group.MAGIC: magic_tile,
    Group.SPECIAL: special_tile,
    Group.MOSAIC: mosaic_tile,
}

# BUILD

def build(tile: Tile) -> Tile:
    tile.cell = BUILD_FACTORY[tile.group](tile)
    if tile.invert:
        tile.cell.invert()
    return tile
