import mrlypy.tile
from dataclasses import dataclass
from typing import List, Optional
from .enums import Boundary

@dataclass
class Config:
    tile: Optional[mrlypy.tile.Config] = None
    max_generations: Optional[int] = None
    birth_counts: Optional[List[int]] = None
    survive_counts: Optional[List[int]] = None
    boundary: Optional[Boundary] = None
    padding: Optional[int] = None
    grid_size: Optional[int] = None
