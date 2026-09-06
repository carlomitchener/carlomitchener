import mrlypy.paint
import mrlypy.tile
from dataclasses import dataclass
from typing import List, Tuple

@dataclass
class Config:
    tile: mrlypy.tile.Config = None
    paint: mrlypy.paint.Config = None
    files: List[Tuple[int, int]] = None
