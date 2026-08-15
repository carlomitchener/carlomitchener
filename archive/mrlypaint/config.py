from dataclasses import dataclass
from typing import List
from .enums import Edition, Ink, Type

@dataclass
class Config:
    editions: List[Edition] = None
    primaries: List[Ink] = None
    target: Type = None
