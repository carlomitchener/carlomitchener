import numpy as np
from dataclasses import dataclass, field
from mrlypy import gen
from typing import Any, Dict, List
from enums import Boundary, Fate, Path, Sequence, Way
from music import Scale, Voice, WaveType

Cell = Dict[str, Any]

@dataclass
class Tile:

    types: np.ndarray = None
    recipe: gen.Tile = None
    grid_size: int = 1
    anti: bool = False
    width: int = None
    height: int = None

    def __post_init__(self):
        if self.types is not None:
            self.height, self.width = self.types.shape

    @property
    def max_size(self) -> int:
        return max(self.width, self.height)

    @property
    def grid_unit_width(self) -> int:
        return self.width * self.grid_size

    @property
    def grid_unit_height(self) -> int:
        return self.height * self.grid_size

    @property
    def max_grid_unit_size(self) -> int:
        return max(self.grid_unit_width, self.grid_unit_height)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "recipe": self.recipe.to_dict() if self.recipe else None,
            "anti": self.anti,
            "width": self.width,
            "height": self.height,
            "grid_size": self.grid_size,
            "grid_unit_width": self.grid_unit_width,
            "grid_unit_height": self.grid_unit_height,
        }

@dataclass
class Life:

    grids: List[Cell] = field(default_factory=list)
    fate: Fate = None
    count: int = 0
    time: float = 0.0

@dataclass
class Task:

    key: str = None
    id: str = None
    seed: int = None

    boundary: Boundary = None
    primary: str = None
    secondary: str = None
    canvas_size: int = None
    canvas_unit_width: int = None
    canvas_unit_height: int = None

    tile: Tile = None
    mask: Tile = None

    way: Way = None
    path: Path = None

    reflect: bool = None
    birth_sequence: Sequence = None
    survive_sequence: Sequence = None
    include_zeros: bool = None
    include_ones: bool = None
    birth_counts: List[int] = field(default_factory=list)
    survive_counts: List[int] = field(default_factory=list)

    music: "MusicParams" = None

    result: Life = None
    count: int = None

    def is_simple(self) -> bool:
        return self.path == Path.SIMPLE

@dataclass
class MusicParams:

    scale: Scale = None
    progression: str = None
    voices: List[Voice] = None
    wave_type: WaveType = None
    num_harmonics: int = None

    def to_dict(self) -> Dict[str, Any]:
        data = {}
        data["scale"] = self.scale.value if self.scale else None
        data["progression"] = self.progression
        data["wave_type"] = self.wave_type.value if self.wave_type else None
        data["num_harmonics"] = self.num_harmonics
        return data

@dataclass
class Saga:

    key: str = None
    seed: int = None

    boundary: Boundary = None
    primary: str = None
    canvas_size: int = None
    canvas_unit_width: int = None
    canvas_unit_height: int = None

    segments: List[Task] = field(default_factory=list)

    grids: List[Cell] = field(default_factory=list)
    segment_lengths: List[int] = field(default_factory=list)
    fate: Fate = None
    count: int = 0
    time: float = 0.0
    attempts: int = 0
