import numpy as np
from typing import TYPE_CHECKING
from mrlycore import binary, rules
from mrlycore.state import state

if TYPE_CHECKING:
    from .models import Cell2d

def build_2d(pattern: np.ndarray, level: int = 1, rotation: int = 0) -> "Cell2d":
    from .models import Cell2d
    cell = Cell2d(types=pattern)
    if level > 1:
        cell.fractal(level)
    if rotation != 0:
        cell.rotate(rotation)
    return cell

def zeros_2d(number: int, level: int = 1, rotation: int = 0) -> "Cell2d":
    return build_2d(binary.zeros_2d(number), level, rotation)

def ones_2d(number: int, level: int = 1, rotation: int = 0) -> "Cell2d":
    return build_2d(binary.ones_2d(number), level, rotation)

def noise_2d(number: int, level: int = 1, density: float = 0.5, rotation: int = 0) -> "Cell2d":
    pattern = binary.noise_2d(number, density, state.rng)
    return build_2d(pattern, level, rotation)

def carpet_2d(number: int, level: int = 1, rotation: int = 0) -> "Cell2d":
    return build_2d(binary.carpet_2d(number), level, rotation)

def net_2d(number: int, level: int = 1, rotation: int = 0) -> "Cell2d":
    return build_2d(binary.net_2d(number), level, rotation)

def tree_2d(number: int, level: int = 1, rotation: int = 0) -> "Cell2d":
    return build_2d(binary.tree_2d(number), level, rotation)

def void_2d(number: int, level: int = 1, rotation: int = 0) -> "Cell2d":
    return build_2d(binary.void_2d(number), level, rotation)

def level_set_2d(number: int, levels, level: int = 1, rotation: int = 0) -> "Cell2d":
    return build_2d(rules.level_set(number, 2, levels), level, rotation)

def vtree_2d(number: int, level: int = 1, rotation: int = 0) -> "Cell2d":
    return build_2d(rules.tree(number, 2, free_axis=0), level, rotation)

def htree_2d(number: int, level: int = 1, rotation: int = 0) -> "Cell2d":
    return build_2d(rules.tree(number, 2, free_axis=1), level, rotation)

def anti_2d(design: "Cell2d") -> "Cell2d":
    return design.invert()

def random_2d(number: int, level: int = 1, rotation: int = 0) -> "Cell2d":
    choices = [carpet_2d, net_2d, tree_2d, void_2d]
    idx = state.rng.choice(len(choices))
    return choices[idx](number, level, rotation)
