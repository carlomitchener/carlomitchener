import numpy as np
from typing import Callable, Iterable, Sequence
from .errors import MrlyError

# THE PARITY UNIVERSE

BASE = 2

# ATOMS

def carpet_rule(parities: Sequence[int]) -> bool:
    return sum(parities) <= 1

def net_rule(parities: Sequence[int]) -> bool:
    dimension = len(parities)
    return sum(parities) >= dimension - 1

def void_rule(parities: Sequence[int]) -> bool:
    return len(set(parities)) == 1

def tree_rule(parities: Sequence[int], fixed_axes: Iterable[int]) -> bool:
    return all(parities[axis] == 0 for axis in fixed_axes)

# LEVEL-SET (THE SYMMETRIC GENUS)

def level_set_rule(parities: Sequence[int], levels: Iterable[int]) -> bool:
    return sum(parities) in set(levels)

def carpet_levels(dimension: int) -> set:
    return {0, 1}

def net_levels(dimension: int) -> set:
    return {dimension - 1, dimension}

def void_levels(dimension: int) -> set:
    return {0, dimension}

# ANTI

def anti_rule(rule: Callable[[Sequence[int]], bool]) -> Callable[[Sequence[int]], bool]:
    def negated(parities: Sequence[int]) -> bool:
        return not rule(parities)
    return negated

# RENDERER

def render(rule: Callable[[Sequence[int]], bool], number: int, dimension: int, base: int = BASE) -> np.ndarray:
    if number < 1:
        raise MrlyError("number must be at least 1.")
    if dimension < 1:
        raise MrlyError("dimension must be at least 1.")
    if base < 1:
        raise MrlyError("base must be at least 1.")
    indices = np.indices((number,) * dimension)
    parities = [(indices[axis] % base) for axis in range(dimension)]
    flat_parities = np.stack([p.ravel() for p in parities], axis=1)
    out = np.empty(flat_parities.shape[0], dtype=np.uint8)
    for i in range(flat_parities.shape[0]):
        out[i] = 1 if rule(tuple(int(v) for v in flat_parities[i])) else 0
    return out.reshape((number,) * dimension)

# VECTORISED RENDERERS

def _parities(number: int, dimension: int, base: int = BASE):
    indices = np.indices((number,) * dimension)
    return [indices[axis] % base for axis in range(dimension)]

def carpet(number: int, dimension: int, base: int = BASE) -> np.ndarray:
    parities = _parities(number, dimension, base)
    return (sum(parities) <= 1).astype(np.uint8)

def net(number: int, dimension: int, base: int = BASE) -> np.ndarray:
    parities = _parities(number, dimension, base)
    return (sum(parities) >= dimension * (base - 1) - 1).astype(np.uint8)

def void(number: int, dimension: int, base: int = BASE) -> np.ndarray:
    parities = _parities(number, dimension, base)
    first = parities[0]
    same = np.ones_like(first, dtype=bool)
    for p in parities[1:]:
        same &= (p == first)
    return same.astype(np.uint8)

def level_set(number: int, dimension: int, levels: Iterable[int], base: int = BASE) -> np.ndarray:
    parities = _parities(number, dimension, base)
    total = sum(parities)
    wanted = set(int(v) for v in levels)
    out = np.zeros_like(total, dtype=bool)
    for level in wanted:
        out |= (total == level)
    return out.astype(np.uint8)

# TREE (THE AXIS GENUS - LINES ONLY, NO SHEETS)

def tree(number: int, dimension: int, free_axis: int, base: int = BASE) -> np.ndarray:
    if not (0 <= free_axis < dimension):
        raise MrlyError(f"free_axis must be in [0, {dimension - 1}], got {free_axis}.")
    parities = _parities(number, dimension, base)
    out = np.ones_like(parities[0], dtype=bool)
    for axis in range(dimension):
        if axis != free_axis:
            out &= (parities[axis] == 0)
    return out.astype(np.uint8)

def tree_axes(dimension: int, free_axis: int) -> set:
    return {axis for axis in range(dimension) if axis != free_axis}
