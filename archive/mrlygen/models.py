from dataclasses import dataclass, field
from typing import Any, Dict, List
from mrlypaint.enums import Edition, Ink
from mrlypaint.models import Paint
from mrlytile.models import Tile
from PIL import Image

# FILE

@dataclass
class File:

    width: int = None
    height: int = None
    data: Image.Image = None

    def to_dict(self) -> Dict[str, Any]:
        return {
            "width": self.width,
            "height": self.height,
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "File":
        f = cls()
        f.width = data["width"]
        f.height = data["height"]
        return f

# GEN

@dataclass
class Gen:

    key: str = None
    seed: int = None
    edition: Edition = None
    primaries: List[Ink] = None
    tile: Tile = None
    mask: Tile = None
    paint: Paint = None
    files: List[File] = field(default_factory=list)

    @property
    def is_cover(self) -> bool:
        return self.edition in [Edition.ROWS, Edition.COLUMNS, Edition.RANDOM]

    @property
    def is_prime(self) -> bool:
        return self.edition in [Edition.LAYERS, Edition.NEIGHBORS]

    def to_dict(self) -> Dict[str, Any]:
        data = {}
        data["key"] = self.key
        data["seed"] = self.seed
        data["edition"] = self.edition.value if self.edition else None
        data["primaries"] = [p.value for p in self.primaries] if self.primaries else None
        data["tile"] = self.tile.to_dict() if self.tile else None
        data["mask"] = self.mask.to_dict() if self.mask else None
        data["paint"] = self.paint.to_dict() if self.paint else None
        data["files"] = [f.to_dict() for f in self.files]
        return data

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "Gen":
        v = cls()
        v.key = data["key"]
        v.seed = data["seed"]
        v.edition = Edition(data["edition"]) if data.get("edition") else None
        v.primaries = [Ink(p) for p in data["primaries"]] if data.get("primaries") else None
        v.tile = Tile.from_dict(data["tile"]) if data.get("tile") else None
        v.mask = Tile.from_dict(data["mask"]) if data.get("mask") else None
        v.paint = Paint.from_dict(data["paint"]) if data.get("paint") else None
        v.files = [File.from_dict(f) for f in data.get("files", [])]
        return v
