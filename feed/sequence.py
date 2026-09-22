from mrlypy.math import counts
from typing import Callable, List
from enums import Sequence
from models import Task

CARPET = 7
NET = 14
TREE = 5
VOID = 9

def evens_sequence(limit: int) -> List[int]:
    return [i for i in range(0, limit + 1, 2)]

def odds_sequence(limit: int) -> List[int]:
    return [i for i in range(1, limit + 1, 2)]

def random_sequence(limit: int, rng) -> List[int]:
    return sorted(rng.sample_indices(limit + 1, rng.range(1, limit + 1)))

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

def mrly_sequence(count: Callable[[int], int]) -> Callable[[int], List[int]]:
    def sequence(limit: int) -> List[int]:
        values = []
        number = 1
        while (value := count(number)) <= limit:
            values.append(value)
            number += 2
        return sorted(set(values))
    return sequence

def fills(code: int) -> Callable[[int], List[int]]:
    return mrly_sequence(lambda number: counts.fill(code, number, 2, 1, 2))

def voids(code: int) -> Callable[[int], List[int]]:
    return mrly_sequence(lambda number: counts.void(code, number, 2, 1, 2))

SEQUENCE_FACTORY = {
    Sequence.EVENS: evens_sequence,
    Sequence.ODDS: odds_sequence,
    Sequence.PRIME: prime_sequence,
    Sequence.BINARY: binary_sequence,
    Sequence.FIBONACCI: fibonacci_sequence,
    Sequence.GRID_SQUARES: mrly_sequence(lambda number: counts.grid(number, 2, 1)),
    Sequence.CARPET_FILL_SQUARES: fills(CARPET),
    Sequence.CARPET_VOID_SQUARES: voids(CARPET),
    Sequence.TREE_FILL_SQUARES: fills(TREE),
    Sequence.TREE_VOID_SQUARES: voids(TREE),
    Sequence.NET_FILL_SQUARES: fills(NET),
    Sequence.NET_VOID_SQUARES: voids(NET),
    Sequence.VOID_FILL_SQUARES: fills(VOID),
    Sequence.VOID_VOID_SQUARES: voids(VOID),
}

def build_sequence(sequence: Sequence, limit: int, rng) -> List[int]:
    if sequence == Sequence.RANDOM:
        return random_sequence(limit, rng)
    return SEQUENCE_FACTORY[sequence](limit)

def create_sequence(task: Task, rng) -> Task:
    print(f"Creating sequence for variation: {task.key}")
    if task.birth_counts and task.survive_counts:
        print(f"Birth counts: {task.birth_counts}")
        print(f"Survive counts: {task.survive_counts}")
        return task
    max_neighbors = int(task.mask.types.sum())
    print(f"Max neighbors: {max_neighbors}")
    raw_birth = build_sequence(task.birth_sequence, max_neighbors, rng)
    raw_survive = build_sequence(task.survive_sequence, max_neighbors, rng)
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

def setup_sequence(task: Task, rng) -> Task:
    print(f"Setting up sequence for variation: {task.key}")
    if task.is_simple():
        sequences = PRIMARIES
    else:
        sequences = PRIMARIES + SECONDARIES
        sequences.remove(Sequence.RANDOM)
    print(f"Sequences: {[s.value for s in sequences]}")
    task.reflect = rng.boolean()
    print(f"Reflect: {task.reflect}")
    match task.reflect:
        case True:
            sequence = rng.choice(sequences)
            print(f"Birth/Survive sequence: {sequence}")
            task.birth_sequence = sequence
            task.survive_sequence = sequence
        case False:
            task.birth_sequence, task.survive_sequence = [sequences[i] for i in rng.sample_indices(len(sequences), 2)]
            print(f"Birth sequence: {task.birth_sequence}")
            print(f"Survive sequence: {task.survive_sequence}")
    task.include_zeros = rng.boolean()
    print(f"Include zeros: {task.include_zeros}")
    task.include_ones = rng.boolean()
    print(f"Include ones: {task.include_ones}")
    return task
