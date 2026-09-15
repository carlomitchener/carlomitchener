from mrlypy.two import Cell2d
from dataclasses import dataclass, field
from mrlypy.life.enums import Boundary, Fate
from mrlypy.life.models import Life
from mrlypy.music import WaveType
from mrlypy.music.enums import Scale
from mrlypy.music.models import Voice
from mrlypy.paint.enums import Ink
from mrlypy.tile import Tile
from typing import Any, Dict, List
from enums import Path, Sequence, Way

@dataclass
class Task:

    key: str = None
    id: str = None
    seed: int = None

    boundary: Boundary = None
    primary: Ink = None
    secondary: Ink = None
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

    def max_canvas_unit_size(self) -> int:
        return max(self.canvas_unit_width, self.canvas_unit_height)

    @staticmethod
    def is_custom(sequence: Sequence) -> bool:
        return sequence in [Sequence.CUSTOM, Sequence.RANDOM]

    def to_dict(self) -> Dict[str, Any]:
        data = {}
        data["key"] = self.key
        data["id"] = self.id
        data["seed"] = self.seed
        data["count"] = self.count
        data["time"] = self.result.time if self.result else None
        data["fate"] = self.result.fate.value if self.result else None
        data["boundary"] = self.boundary.value if self.boundary else None
        data["primary"] = self.primary.value if self.primary else None
        data["secondary"] = self.secondary.value if self.secondary else None
        data["canvas_size"] = self.canvas_size
        data["canvas_unit_width"] = self.canvas_unit_width
        data["canvas_unit_height"] = self.canvas_unit_height
        data["tile"] = self.tile.to_dict() if self.tile else None
        data["mask"] = self.mask.to_dict() if self.mask else None
        data["way"] = self.way.value if self.way else None
        data["path"] = self.path.value if self.path else None
        data["reflect"] = self.reflect
        data["birth_sequence"] = self.birth_sequence.value if self.birth_sequence else None
        data["survive_sequence"] = self.survive_sequence.value if self.survive_sequence else None
        data["include_zeros"] = self.include_zeros
        data["include_ones"] = self.include_ones
        data["birth_counts"] = self.birth_counts if self.is_custom(self.birth_sequence) else None
        data["survive_counts"] = self.survive_counts if self.is_custom(self.survive_sequence) else None
        data["music"] = self.music.to_dict() if self.music else None
        data["grids"] = [grid.to_strings() for grid in self.result.grids] if self.result else None
        return data

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "Task":
        task = cls()
        task.key = data.get("key")
        task.id = data.get("id")
        task.seed = data.get("seed")
        task.boundary = Boundary(data.get("boundary")) if data.get("boundary") else None
        task.primary = Ink(data.get("primary")) if data.get("primary") else None
        task.secondary = Ink(data.get("secondary")) if data.get("secondary") else None
        task.canvas_size = data.get("canvas_size")
        task.canvas_unit_width = data.get("canvas_unit_width")
        task.canvas_unit_height = data.get("canvas_unit_height")
        tile_data = data.get("tile")
        task.tile = Tile.from_dict(tile_data) if tile_data else None
        mask_data = data.get("mask")
        task.mask = Tile.from_dict(mask_data) if mask_data else None
        task.way = Way(data.get("way")) if data.get("way") else None
        task.path = Path(data.get("path")) if data.get("path") else None
        task.reflect = data.get("reflect")
        task.birth_sequence = Sequence(data.get("birth_sequence")) if data.get("birth_sequence") else None
        task.survive_sequence = Sequence(data.get("survive_sequence")) if data.get("survive_sequence") else None
        task.include_zeros = data.get("include_zeros")
        task.include_ones = data.get("include_ones")
        task.birth_counts = data.get("birth_counts", [])
        task.survive_counts = data.get("survive_counts", [])
        music_data = data.get("music")
        task.music = MusicParams.from_dict(music_data) if music_data else None
        grids_data = data.get("grids")
        grids = [Cell2d.from_strings(grid) for grid in grids_data] if grids_data else []
        fate = Fate(data.get("fate")) if data.get("fate") else None
        count = data.get("count")
        time = data.get("time")
        task.count = count
        if grids:
            task.result = Life(grids=grids, fate=fate, count=count, time=time)
        return task

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

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "MusicParams":
        params = cls()
        params.scale = Scale(data.get("scale")) if data.get("scale") else None
        params.progression = data.get("progression")
        params.wave_type = WaveType(data.get("wave_type")) if data.get("wave_type") else None
        params.num_harmonics = data.get("num_harmonics")
        return params

@dataclass
class Saga:

    key: str = None
    seed: int = None

    boundary: Boundary = None
    primary: Ink = None
    canvas_size: int = None
    canvas_unit_width: int = None
    canvas_unit_height: int = None

    segments: List[Task] = field(default_factory=list)

    grids: List[Cell2d] = field(default_factory=list)
    segment_lengths: List[int] = field(default_factory=list)
    fate: Fate = None
    count: int = 0
    time: float = 0.0

    def to_dict(self) -> Dict[str, Any]:
        data = {}
        data["key"] = self.key
        data["seed"] = self.seed
        data["boundary"] = self.boundary.value if self.boundary else None
        data["primary"] = self.primary.value if self.primary else None
        data["canvas_size"] = self.canvas_size
        data["canvas_unit_width"] = self.canvas_unit_width
        data["canvas_unit_height"] = self.canvas_unit_height
        data["fate"] = self.fate.value if self.fate else None
        data["count"] = self.count
        data["time"] = self.time
        data["segment_lengths"] = self.segment_lengths
        data["segments"] = [s.to_dict() for s in self.segments]
        data["grids"] = [g.to_strings() for g in self.grids] if self.grids else None
        return data

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "Saga":
        saga = cls()
        saga.key = data.get("key")
        saga.seed = data.get("seed")
        saga.boundary = Boundary(data.get("boundary")) if data.get("boundary") else None
        saga.primary = Ink(data.get("primary")) if data.get("primary") else None
        saga.canvas_size = data.get("canvas_size")
        saga.canvas_unit_width = data.get("canvas_unit_width")
        saga.canvas_unit_height = data.get("canvas_unit_height")
        saga.fate = Fate(data.get("fate")) if data.get("fate") else None
        saga.count = data.get("count", 0)
        saga.time = data.get("time", 0.0)
        saga.segment_lengths = data.get("segment_lengths", [])
        saga.segments = [Task.from_dict(s) for s in data.get("segments", [])]
        grids_data = data.get("grids")
        saga.grids = [Cell2d.from_strings(g) for g in grids_data] if grids_data else []
        return saga
