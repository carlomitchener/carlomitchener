import numpy as np
from typing import TYPE_CHECKING
from mrlycore import binary, rules
from mrlycore.state import state

if TYPE_CHECKING:
    from .models import Cell3d

def build_3d(pattern: np.ndarray, level: int = 1) -> "Cell3d":
    from .models import Cell3d
    cell = Cell3d(types=pattern)
    if level > 1:
        cell.fractal(level)
    return cell

def zeros_3d(number: int, level: int = 1) -> "Cell3d":
    return build_3d(binary.zeros_3d(number), level)

def ones_3d(number: int, level: int = 1) -> "Cell3d":
    return build_3d(binary.ones_3d(number), level)

def noise_3d(number: int, level: int = 1, density: float = 0.5) -> "Cell3d":
    pattern = binary.noise_3d(number, density, state.rng)
    return build_3d(pattern, level)

def carpet_3d(number: int, level: int = 1) -> "Cell3d":
    return build_3d(binary.carpet_3d(number), level)

def net_3d(number: int, level: int = 1) -> "Cell3d":
    return build_3d(binary.net_3d(number), level)

def tree_3d(number: int, level: int = 1) -> "Cell3d":
    return build_3d(binary.tree_3d(number), level)

def void_3d(number: int, level: int = 1) -> "Cell3d":
    return build_3d(binary.void_3d(number), level)

def level_set_3d(number: int, levels, level: int = 1) -> "Cell3d":
    return build_3d(rules.level_set(number, 3, levels), level)

def xtree_3d(number: int, level: int = 1) -> "Cell3d":
    return build_3d(rules.tree(number, 3, free_axis=0), level)

def ytree_3d(number: int, level: int = 1) -> "Cell3d":
    return build_3d(rules.tree(number, 3, free_axis=1), level)

def ztree_3d(number: int, level: int = 1) -> "Cell3d":
    return build_3d(rules.tree(number, 3, free_axis=2), level)

def anti_3d(design: "Cell3d") -> "Cell3d":
    return design.invert()

def random_3d(number: int, level: int = 1) -> "Cell3d":
    choices = [carpet_3d, net_3d, tree_3d, void_3d]
    idx = state.rng.choice(len(choices))
    return choices[idx](number, level)
