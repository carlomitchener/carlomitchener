import math
from typing import List, Tuple
from mrlypy.core.state import choice, bool, sample, shuffle
from .config import Config
from .enums import Design, Group
from .models import Tile
from .randomizer import random_design, random_rotation

NUMBERS = [3, 5, 7, 9, 11]

# MATH HELPERS

def generals(min_size: int, max_size: int) -> List[int]:
    return [n for n in range(3, max_size + 1, 2) if min_size <= n <= max_size]

def powers(min_size: int, max_size: int) -> List[Tuple[int, int]]:
    options = []
    for n in NUMBERS:
        try:
            min_level = math.ceil(math.log(min_size, n)) if min_size > 1 else 2
            max_level = math.floor(math.log(max_size, n))
            min_level = max(2, min_level)
            if min_level <= max_level:
                for level in range(min_level, max_level + 1):
                    options.append((n, level))
        except ValueError:
            continue
    return options

def products(min_size: int, max_size: int, count: int) -> List[Tuple[int, ...]]:
    if count < 1:
        return []
    def find_recursive(current_min: float, current_max: float, remaining_count: int) -> List[List[int]]:
        if current_min > current_max:
            return []
        if remaining_count == 1:
            min_n = math.ceil(current_min)
            if min_n < 3:
                min_n = 3
            if min_n % 2 == 0:
                min_n += 1
            results = []
            for n in range(int(min_n), int(current_max) + 1, 2):
                results.append([n])
            return results
        options = []
        for n in NUMBERS:
            new_min = current_min / n
            new_max = current_max / n
            sub_options = find_recursive(new_min, new_max, remaining_count - 1)
            for sub_option in sub_options:
                options.append([n] + sub_option)
        return options
    return [tuple(opt) for opt in find_recursive(float(min_size), float(max_size), count)]

# TILE CREATORS

def general_tile(tile: Tile, config: Config) -> Tile | None:
    tile.group = Group.GENERAL
    tile.design = [random_design(config.designs)]
    possible_numbers = generals(config.min_size, config.max_size)
    if not possible_numbers:
        return None
    tile.number = [choice(possible_numbers)]
    tile.level = [1]
    tile.rotation = [random_rotation(tile.design[0])]
    size = tile.number[0]
    tile.unit_size(size, size)
    tile.mask = tile.number[0]
    return tile

def fractal_tile(tile: Tile, config: Config) -> Tile | None:
    tile.group = Group.FRACTAL
    tile.design = [random_design(config.designs)]
    possible_options = powers(config.min_size, config.max_size)
    if not possible_options:
        return None
    n, level = choice(possible_options)
    tile.number = [n]
    tile.level = [level]
    tile.rotation = [random_rotation(tile.design[0])]
    size = tile.number[0] ** tile.level[0]
    tile.unit_size(size, size)
    tile.mask = tile.number[0]
    return tile

def magic_tile(tile: Tile, config: Config) -> Tile | None:
    tile.group = Group.MAGIC
    counts = {}
    counts[2] = products(config.min_size, config.max_size, 2)
    counts[3] = products(config.min_size, config.max_size, 3)
    valid_counts = [k for k, v in counts.items() if v]
    if not valid_counts:
        return None
    count = choice(valid_counts)
    tile.design = [random_design(config.designs) for _ in range(count)]
    options = counts[count]
    magic_options = []
    fractal_options = []
    is_same_design = len(set(tile.design)) == 1
    for option in options:
        is_same_number = len(set(option)) == 1
        if is_same_design and is_same_number:
            fractal_options.append(option)
        else:
            magic_options.append(option)
    if not magic_options:
        if not fractal_options:
            return None
        picked = choice(fractal_options)
    else:
        picked = choice(magic_options)
    tile.number = list(picked)
    tile.level = [1] * count
    tile.rotation = [random_rotation(d) for d in tile.design]
    size = 1
    for n in tile.number:
        size *= n
    tile.unit_size(size, size)
    tile.mask = tile.number[0]
    return tile

def special_tile(tile: Tile, config: Config) -> Tile | None:
    tile.group = Group.SPECIAL
    tile.design = [random_design(config.designs)]
    possible_options = products(config.min_size, config.max_size, 2)
    if not possible_options:
        return None
    mask, n = choice(possible_options)
    tile.mask = mask
    tile.number = [n]
    tile.level = [1]
    tile.rotation = [random_rotation(tile.design[0])]
    size = tile.mask * tile.number[0]
    tile.unit_size(size, size)
    tile.flip = bool()
    return tile

def mosaic_tile(tile: Tile, config: Config) -> Tile | None:
    tile.group = Group.MOSAIC
    choices = list(Design) if config.designs is None else config.designs
    if len(choices) < 3:
        return None
    tile.design = sample(choices, 3)
    possible_options = products(config.min_size, config.max_size, 2)
    if not possible_options:
        return None
    mask, n = choice(possible_options)
    tile.mask = mask
    tile.number = [n, n, n]
    tile.level = [1, 1, 1]
    tile.rotation = [random_rotation(d) for d in tile.design]
    size = tile.mask * n
    tile.unit_size(size, size)
    return tile

TILE_FACTORY = {
    Group.GENERAL: general_tile,
    Group.FRACTAL: fractal_tile,
    Group.MAGIC: magic_tile,
    Group.SPECIAL: special_tile,
    Group.MOSAIC: mosaic_tile,
}

# CREATE

def create(config: Config) -> Tile:
    candidate = None
    all_groups = list(Group)
    possible_groups = all_groups if config.groups is None else list(config.groups)
    shuffle(possible_groups)
    for group in possible_groups:
        candidate = TILE_FACTORY[group](Tile(), config)
        if candidate:
            break
    if not candidate:
        raise ValueError("Could not generate a tile with the given size constraints.")
    tile = candidate
    if tile.design:
        if config.anti is None:
            tile.anti = [bool() for _ in range(len(tile.design))]
        else:
            tile.anti = [config.anti] * len(tile.design)
    tile.invert = bool() if config.invert is None else config.invert
    return tile
