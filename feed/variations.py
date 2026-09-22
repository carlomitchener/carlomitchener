from dataclasses import replace
from mrlypy import gen
from mrlypy.core import cell
from mrlypy.gen import build
from config import MAX_CANVAS, MAX_MASK, MAX_TILE, MIN_CANVAS, MIN_MASK, MIN_TILE
from enums import Path
from models import Task, Tile

SIZES = [1, 3, 5, 7, 9, 11]
MASK_GROUPS = ["General", "Fractal", "Magic"]

# RECIPES

def classic(design: str, rotation: int, invert: bool) -> gen.Tile:
    recipe = gen.Tile.new("General")
    recipe.sources = [{"design": design}]
    recipe.numbers = [3]
    recipe.levels = [1]
    recipe.rotations = [rotation]
    recipe.invert = invert
    recipe.resize()
    return recipe

def built(recipe: gen.Tile) -> Tile:
    return Tile(types=build.build_2d(recipe)["types"], recipe=recipe)

# TILE

def setup_grid(tile: Tile, max_canvas: int, rng) -> Tile:
    print(f"Setting up grid for tile")
    possible_grid_sizes = [i for i in SIZES if tile.max_size * i <= max_canvas] or [1]
    print(f"Possible grid sizes: {possible_grid_sizes}")
    tile.grid_size = rng.choice(possible_grid_sizes)
    print(f"Chosen grid size: {tile.grid_size}")
    return tile

def setup_tile(task: Task, rng) -> Task:
    print(f"Setting up tile for variation: {task.key}")
    recipe = build.create_2d({**build.Config2d.default(), "min_size": MIN_TILE, "max_size": MAX_TILE}, rng)
    task.tile = setup_grid(built(recipe), MAX_CANVAS, rng)
    return task

def setup_canvas(task: Task, rng) -> Task:
    print(f"Setting up canvas for variation: {task.key}")
    initial_size = task.tile.max_grid_unit_size
    possible_sizes = [i for i in SIZES if MIN_CANVAS <= initial_size * i <= MAX_CANVAS] or [1]
    print(f"Possible canvas sizes: {possible_sizes}")
    task.canvas_size = rng.choice(possible_sizes)
    print(f"Chosen canvas size: {task.canvas_size}")
    task.canvas_unit_width = task.canvas_size * task.tile.grid_unit_width
    task.canvas_unit_height = task.canvas_size * task.tile.grid_unit_height
    return task

# MASK

def pop_center(tile: Tile) -> Tile:
    types = tile.types.copy()
    types[tile.height // 2, tile.width // 2] = 0
    return replace(tile, types=types)

def copy_mask(tile: Tile, rng) -> Tile:
    if not rng.boolean():
        return tile
    return replace(tile, types=cell.invert(cell.new(tile.types))["types"], anti=not tile.anti)

def simple_mask(rng) -> Tile:
    design = gen.random_design(rng)
    rotation = gen.random_rotation(design, rng)
    invert = rng.boolean() if design == "Vtree" else False
    return built(classic(design, rotation, invert))

def basic_mask(min_size: int, max_size: int, rng) -> Tile:
    return built(build.create_2d({**build.Config2d.default(), "groups": MASK_GROUPS, "min_size": min_size, "max_size": max_size}, rng))

def moore_mask() -> Tile:
    print(f"Setting up Moore mask")
    return built(classic("Carpet", 0, False))

def setup_mask(task: Task, rng) -> Task:
    print(f"Setting up mask for variation: {task.key}")
    paths = [Path.SIMPLE, Path.BASIC]
    tile_size = task.tile.max_size
    max_mask = min(MAX_MASK, task.canvas_unit_width, task.canvas_unit_height)
    print(f"Tile size: {tile_size}, max mask: {max_mask}")
    if MIN_MASK <= tile_size <= max_mask:
        paths.append(Path.COPY)
    print(f"Possible paths: {[p.value for p in paths]}")
    path = rng.choice(paths)
    print(f"Chosen path: {path}")
    match path:
        case Path.SIMPLE:
            mask = simple_mask(rng)
        case Path.BASIC:
            mask = basic_mask(MIN_MASK, max_mask, rng)
        case Path.COPY:
            mask = copy_mask(task.tile, rng)
    task.path = path
    task.mask = pop_center(mask)
    return task

def setup_variations(task: Task, rng) -> Task:
    print(f"Setting up variations for variation: {task.key}")
    task = setup_tile(task, rng)
    task = setup_canvas(task, rng)
    task = setup_mask(task, rng)
    return task

def tile_from_grid(grid) -> Tile:
    return Tile(types=grid["types"])
