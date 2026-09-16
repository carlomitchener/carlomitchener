from mrlypy.core.state import randint, sample, bool, choice
import numpy as np
from mrlypy.core import formulas as f
from typing import Callable, List
from enums import Sequence
from models import Task

def evens_sequence(limit: int) -> List[int]:
    return [i for i in range(0, limit + 1, 2)]

def odds_sequence(limit: int) -> List[int]:
    return [i for i in range(1, limit + 1, 2)]

def random_sequence(limit: int) -> List[int]:
    options = list(range(0, limit + 1))
    count = randint(1, len(options))
    return sorted(sample(options, count))

def prime_sequence(limit: int) -> List[int]:
    if limit < 2:
        return []
    return [2] + [i for i in range(3, limit + 1, 2) if all(i % j != 0 for j in range(3, int(i**0.5) + 1, 2))]

def binary_sequence(limit: int) -> List[int]:
    sequence = []
    n = 0
    while True:
        val = 2**n
        if val > limit:
            break
        sequence.append(val)
        n += 1
    return sequence

def fibonacci_sequence(limit: int) -> List[int]:
    sequence = []
    a, b = 0, 1
    while a <= limit:
        sequence.append(a)
        a, b = b, a + b
    return sorted(list(set(sequence)))

def mrly_sequence(limit: int, generator: Callable) -> List[int]:
    sequence = []
    number = 1
    level = 1
    while True:
        val = generator(number, level)
        if val > limit:
            break
        sequence.append(val)
        number += 2
    return sorted(list(set(sequence)))

def grid_squares_sequence(limit: int) -> List[int]:
    return mrly_sequence(limit, f.grid_squares)

def carpet_fill_squares_sequence(limit: int) -> List[int]:
    return mrly_sequence(limit, f.carpet_fill_squares)

def carpet_void_squares_sequence(limit: int) -> List[int]:
    return mrly_sequence(limit, f.carpet_void_squares)

def net_fill_squares_sequence(limit: int) -> List[int]:
    return mrly_sequence(limit, f.net_fill_squares)

def net_void_squares_sequence(limit: int) -> List[int]:
    return mrly_sequence(limit, f.net_void_squares)

def tree_fill_squares_sequence(limit: int) -> List[int]:
    return mrly_sequence(limit, f.tree_fill_squares)

def tree_void_squares_sequence(limit: int) -> List[int]:
    return mrly_sequence(limit, f.tree_void_squares)

def void_fill_squares_sequence(limit: int) -> List[int]:
    return mrly_sequence(limit, f.void_fill_squares)

def void_void_squares_sequence(limit: int) -> List[int]:
    return mrly_sequence(limit, f.void_void_squares)

SEQUENCE_FACTORY = {
    Sequence.EVENS: evens_sequence,
    Sequence.ODDS: odds_sequence,
    Sequence.RANDOM: random_sequence,
    Sequence.PRIME: prime_sequence,
    Sequence.BINARY: binary_sequence,
    Sequence.FIBONACCI: fibonacci_sequence,
    Sequence.GRID_SQUARES: grid_squares_sequence,
    Sequence.CARPET_FILL_SQUARES: carpet_fill_squares_sequence,
    Sequence.CARPET_VOID_SQUARES: carpet_void_squares_sequence,
    Sequence.TREE_FILL_SQUARES: tree_fill_squares_sequence,
    Sequence.TREE_VOID_SQUARES: tree_void_squares_sequence,
    Sequence.NET_FILL_SQUARES: net_fill_squares_sequence,
    Sequence.NET_VOID_SQUARES: net_void_squares_sequence,
    Sequence.VOID_FILL_SQUARES: void_fill_squares_sequence,
    Sequence.VOID_VOID_SQUARES: void_void_squares_sequence,
}

def create_sequence(task: Task) -> Task:
    print(f"Creating sequence for variation: {task.key}")
    if task.birth_counts and task.survive_counts:
        print(f"Birth counts: {task.birth_counts}")
        print(f"Survive counts: {task.survive_counts}")
        return task
    max_neighbors = int(np.sum(task.mask.cell.types))
    print(f"Max neighbors: {max_neighbors}")
    raw_birth = SEQUENCE_FACTORY[task.birth_sequence](max_neighbors)
    raw_survive = SEQUENCE_FACTORY[task.survive_sequence](max_neighbors)
    task.birth_counts = [
        x for x in raw_birth
        if (x != 0 or task.include_zeros) and (x != 1 or task.include_ones)
    ]
    print(f"Birth counts: {task.birth_counts[:10]}")
    task.survive_counts = [
        x for x in raw_survive
        if (x != 0 or task.include_zeros) and (x != 1 or task.include_ones)
    ]
    print(f"Survive counts: {task.survive_counts[:10]}")
    return task

# PRIMARIES

PRIMARIES = [
    Sequence.EVENS,
    Sequence.ODDS,
    Sequence.RANDOM,
    Sequence.PRIME,
    Sequence.BINARY,
    Sequence.FIBONACCI,
]

SECONDARIES = [
    Sequence.GRID_SQUARES,
    Sequence.CARPET_FILL_SQUARES,
    Sequence.CARPET_VOID_SQUARES,
    Sequence.NET_FILL_SQUARES,
    Sequence.NET_VOID_SQUARES,
    Sequence.TREE_FILL_SQUARES,
    Sequence.TREE_VOID_SQUARES,
    Sequence.VOID_FILL_SQUARES,
    Sequence.VOID_VOID_SQUARES
]

def setup_sequence(task: Task) -> Task:
    print(f"Setting up sequence for variation: {task.key}")
    if task.is_simple():
        sequences = PRIMARIES
    else:
        sequences = PRIMARIES + SECONDARIES
        sequences.remove(Sequence.RANDOM)
    print(f"Sequences: {[s.value for s in sequences]}")
    task.reflect = bool()
    print(f"Reflect: {task.reflect}")
    match task.reflect:
        case True:
            sequence = choice(sequences)
            print(f"Birth/Survive sequence: {sequence}")
            task.birth_sequence = sequence
            task.survive_sequence = sequence
        case False:
            task.birth_sequence, task.survive_sequence = sample(sequences, 2)
            print(f"Birth sequence: {task.birth_sequence}")
            print(f"Survive sequence: {task.survive_sequence}")
    task.include_zeros = bool()
    print(f"Include zeros: {task.include_zeros}")
    task.include_ones = bool()
    print(f"Include ones: {task.include_ones}")
    return task
