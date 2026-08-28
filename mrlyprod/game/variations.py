import copy
from mrlypy.core.state import choice, bool
from mrlypy.two import Cell2d, carpet_2d
import mrlypy.tile
from mrlypy.tile import Tile, build, random_design, random_rotation
from mrlypy.tile.enums import Design, Group
from config import MAX_CANVAS, MAX_MASK, MAX_TILE, MIN_CANVAS, MIN_MASK, MIN_TILE
from enums import Path
from models import Task

def setup_grid(tile: Tile, max_canvas: int) -> Tile:
    print(f"Setting up grid for tile")
    possible_grid_sizes = []
    base_size = tile.max_unit_size
    for i in [1, 3, 5, 7, 9, 11]:
        if base_size * i <= max_canvas:
            possible_grid_sizes.append(i)
    if not possible_grid_sizes:
        possible_grid_sizes = [1]
    print(f"Possible grid sizes: {possible_grid_sizes}")
    tile.grid_size = choice(possible_grid_sizes)
    print(f"Chosen grid size: {tile.grid_size}")
    tile.grid_unit_width = tile.unit_width * tile.grid_size
    tile.grid_unit_height = tile.unit_height * tile.grid_size
    return tile

def setup_tile(task: Task) -> Task:
    print(f"Setting up tile for variation: {task.key}")
    tile_config = mrlypy.tile.Config(
        min_size=MIN_TILE,
        max_size=MAX_TILE
    )
    tile = mrlypy.tile.create(tile_config)
    tile = setup_grid(tile, MAX_CANVAS)
    tile = build(tile)
    task.tile = tile
    return task

def setup_canvas(task: Task) -> Task:
    print(f"Setting up canvas for variation: {task.key}")
    initial_size = task.tile.max_grid_unit_size
    possible_sizes = []
    for i in [1, 3, 5, 7, 9, 11]:
        size = initial_size * i
        if MIN_CANVAS <= size <= MAX_CANVAS:
            possible_sizes.append(i)
    if not possible_sizes:
        possible_sizes = [1]
    print(f"Possible canvas sizes: {possible_sizes}")
    task.canvas_size = choice(possible_sizes)
    print(f"Chosen canvas size: {task.canvas_size}")
    task.canvas_unit_width = task.canvas_size * task.tile.grid_unit_width
    task.canvas_unit_height = task.canvas_size * task.tile.grid_unit_height
    return task

def pop_center(cell: Cell2d) -> Cell2d:
    center_index = cell.types.shape[0] // 2
    cell.types[center_index, center_index] = 0
    return cell

def copy_mask(tile: Tile) -> Tile:
    t = copy.deepcopy(tile)
    if bool():
        t.invert = not t.invert
        t.cell.invert()
    return t

def simple_mask() -> Tile:
    tile = Tile()
    tile.group = Group.GENERAL
    tile.design = [random_design()]
    tile.number = [3]
    tile.level = [1]
    tile.rotation = [random_rotation(tile.design[0])]
    tile.invert = bool() if tile.design[0] == Design.TREE else False
    tile = build(tile)
    pop_center(tile.cell)
    size = tile.number[0]
    tile.unit_width = size
    tile.unit_height = size
    tile.grid_size = 1
    tile.grid_unit_width = size
    tile.grid_unit_height = size
    return tile

def basic_mask(min_size: int, max_size: int) -> Tile:
    tile_config = mrlypy.tile.Config(groups=[Group.GENERAL, Group.FRACTAL, Group.MAGIC], min_size=min_size, max_size=max_size)
    tile = mrlypy.tile.create(tile_config)
    tile = build(tile)
    return tile

def moore_mask() -> Tile:
    print(f"Setting up Moore mask")
    tile = Tile()
    tile.group = Group.GENERAL
    tile.design = [Design.CARPET]
    tile.number = [3]
    tile.level = [1]
    tile.cell = carpet_2d(3)
    size = tile.number[0]
    tile.unit_width = size
    tile.unit_height = size
    tile.grid_size = 1
    tile.grid_unit_width = size
    tile.grid_unit_height = size
    return tile

def setup_mask(task: Task) -> Task:
    print(f"Setting up mask for variation: {task.key}")
    paths = [Path.SIMPLE, Path.BASIC]
    tile_size = task.tile.max_unit_size
    print(f"Tile size: {tile_size}")
    if MIN_MASK <= tile_size <= MAX_MASK:
        paths.append(Path.COPY)
    print(f"Possible paths: {[p.value for p in paths]}")
    path = choice(paths)
    print(f"Chosen path: {path}")
    match path:
        case Path.SIMPLE:
            task.mask = simple_mask()
        case Path.BASIC:
            task.mask = basic_mask(MIN_MASK, MAX_MASK)
        case Path.COPY:
            task.mask = copy_mask(task.tile)
    task.path = path
    task.mask.cell = pop_center(task.mask.cell)
    return task

def setup_variations(task: Task) -> Task:
    print(f"Setting up variations for variation: {task.key}")
    task = setup_tile(task)
    task = setup_canvas(task)
    task = setup_mask(task)
    return task

def tile_from_grid(grid: Cell2d) -> Tile:
    h, w = grid.types.shape
    tile = Tile()
    tile.cell = grid
    tile.unit_width = w
    tile.unit_height = h
    tile.grid_size = 1
    tile.grid_unit_width = w
    tile.grid_unit_height = h
    tile.invert = False
    return tile
