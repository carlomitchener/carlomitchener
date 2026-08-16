from mrlycore.state import seed, choice
from mrlycore.helpers import hex_key, random_seed
from mrlylife.enums import Boundary
from mrlypaint.enums import Ink
from mrlytwo import Cell2d
from colors import SECONDARIES
from enums import Path, Sequence, Way
from models import Saga, Task
from music import compose_music_params
from sequence import setup_sequence, create_sequence
from variations import (
    moore_mask,
    setup_canvas,
    setup_mask,
    setup_tile,
    setup_variations,
    tile_from_grid,
)

# SAGA

def setup_saga_seed(saga: Saga) -> Saga:
    s = random_seed()
    print(f"Setting up saga seed: {s}")
    seed(s)
    saga.seed = s
    return saga

def setup_saga_key(saga: Saga) -> Saga:
    saga.key = hex_key(8)
    print(f"Setting up saga key: {saga.key}")
    return saga

def setup_saga_boundary(saga: Saga) -> Saga:
    saga.boundary = choice(list(Boundary))
    print(f"Setting up saga boundary: {saga.boundary}")
    return saga

def setup_saga_colors(saga: Saga) -> Saga:
    print(f"Setting up saga colors")
    saga.primary = Ink.BLACK
    print(f"Primary: {saga.primary}")
    return saga

def setup_saga(saga: Saga) -> Saga:
    print(f"Setting up saga")
    saga = setup_saga_seed(saga)
    saga = setup_saga_key(saga)
    saga = setup_saga_boundary(saga)
    saga = setup_saga_colors(saga)
    return saga

# WAYS

def setup_conway(task: Task) -> Task:
    print(f"Setting up ConWay for segment: {task.key}")
    task = setup_tile(task)
    task = setup_canvas(task)
    task.mask = moore_mask()
    task.path = Path.SIMPLE
    task.birth_sequence = Sequence.CUSTOM
    task.birth_counts = [3]
    task.survive_sequence = Sequence.CUSTOM
    task.survive_counts = [2, 3]
    return task

def setup_mrlyway(task: Task) -> Task:
    print(f"Setting up MrlyWay for segment: {task.key}")
    task = setup_variations(task)
    task = setup_sequence(task)
    task = create_sequence(task)
    return task

def setup_way(task: Task) -> Task:
    way = choice(list(Way))
    task.way = way
    print(f"Way: {way}")
    match way:
        case Way.CONWAY:
            return setup_conway(task)
        case Way.MRLYWAY:
            return setup_mrlyway(task)

# SEGMENT

def _setup_chained_conway(task: Task) -> Task:
    print(f"Setting up chained ConWay for segment: {task.key}")
    task.mask = moore_mask()
    task.path = Path.SIMPLE
    task.birth_sequence = Sequence.CUSTOM
    task.birth_counts = [3]
    task.survive_sequence = Sequence.CUSTOM
    task.survive_counts = [2, 3]
    return task

def _setup_chained_mrlyway(task: Task) -> Task:
    print(f"Setting up chained MrlyWay for segment: {task.key}")
    task = setup_mask(task)
    task = setup_sequence(task)
    task = create_sequence(task)
    return task

def setup_segment_way(task: Task, prev_grid: Cell2d, prev_way: Way) -> Task:
    task.tile = tile_from_grid(prev_grid)
    way = Way.MRLYWAY if prev_way == Way.CONWAY else Way.CONWAY
    task.way = way
    print(f"Way: {way} (flipped from {prev_way})")
    match way:
        case Way.CONWAY:
            return _setup_chained_conway(task)
        case Way.MRLYWAY:
            return _setup_chained_mrlyway(task)

def setup_segment(saga: Saga, index: int, prev_grid: Cell2d = None) -> Task:
    print(f"Setting up segment {index}")
    task = Task()
    task.key = hex_key(8)
    task.seed = saga.seed
    task.boundary = saga.boundary
    task.primary = saga.primary
    task.secondary = choice(list(SECONDARIES.keys()))
    print(f"Secondary: {task.secondary}")
    if index == 0:
        task = setup_way(task)
        saga.canvas_size = task.canvas_size
        saga.canvas_unit_width = task.canvas_unit_width
        saga.canvas_unit_height = task.canvas_unit_height
    else:
        task.canvas_size = saga.canvas_size
        task.canvas_unit_width = saga.canvas_unit_width
        task.canvas_unit_height = saga.canvas_unit_height
        prev_way = saga.segments[-1].way
        task = setup_segment_way(task, prev_grid, prev_way)
    task.music = compose_music_params(task.way)
    return task
