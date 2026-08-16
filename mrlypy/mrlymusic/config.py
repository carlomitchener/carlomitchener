from dataclasses import dataclass
from typing import Dict, List
from .enums import ChordType, Scale

@dataclass
class Config:
    # AUDIO
    sample_rate: int = None
    fade_duration: float = None
    # THEORY
    scales: Dict[Scale, List[int]] = None
    chord_types: Dict[ChordType, List[int]] = None
