from typing import List
from mrlypy.core.state import choice
from .enums import Design

def random_design(designs: List[Design] = None) -> Design:
    if designs is None:
        designs = list(Design)
    return choice(designs)

def random_rotation(design: Design) -> int:
    return choice([0, 1]) if design == Design.TREE else 0
