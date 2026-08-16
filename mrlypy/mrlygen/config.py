import mrlypaint
import mrlytile
from dataclasses import dataclass
from typing import List, Tuple

@dataclass
class Config:
    tile: mrlytile.Config = None
    paint: mrlypaint.Config = None
    files: List[Tuple[int, int]] = None
