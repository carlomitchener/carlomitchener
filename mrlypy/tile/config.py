from dataclasses import dataclass
from typing import List
from .enums import Design, Group

@dataclass
class Config:
    groups: List[Group] = None
    designs: List[Design] = None
    min_size: int = None
    max_size: int = None
    invert: bool = None
    anti: bool = None
