from mrlytwo import Cell2d
from dataclasses import dataclass, field
from typing import List
from .enums import Fate

@dataclass
class Life:
    grids: List[Cell2d] = field(default_factory=list)
    fate: Fate = None
    count: int = 0
    time: float = 0.0
    loop: int = 0
