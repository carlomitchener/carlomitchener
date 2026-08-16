from dataclasses import dataclass
from typing import Any, Dict, List
from mrlytwo import Cell2d
from .enums import Design, Group

# TILE

@dataclass
class Tile:

    group: Group = None
    mask: int = None
    design: List[Design] = None
    number: List[int] = None
    level: List[int] = None
    rotation: List[int] = None
    invert: bool = None
    anti: List[bool] = None
    flip: bool = None
    density: float = None
    unit_width: int = None
    unit_height: int = None
    grid_size: int = None
    grid_unit_width: int = None
    grid_unit_height: int = None
    cell: Cell2d = None

    def unit_size(self, width: int, height: int) -> "Tile":
        self.unit_width = width
        self.unit_height = height
        return self

    @property
    def max_unit_size(self) -> int:
        return max(self.unit_width, self.unit_height)

    @property
    def max_grid_unit_size(self) -> int:
        return max(self.grid_unit_width, self.grid_unit_height)

    def to_dict(self) -> Dict[str, Any]:
        data = {}
        data["group"] = self.group.value if self.group else None
        data["mask"] = self.mask
        data["design"] = [d.value for d in self.design] if self.design else None
        data["number"] = self.number
        data["level"] = self.level
        data["rotation"] = self.rotation
        data["invert"] = self.invert
        data["anti"] = self.anti
        data["flip"] = self.flip
        data["density"] = self.density
        data["unit_width"] = self.unit_width
        data["unit_height"] = self.unit_height
        data["grid_size"] = self.grid_size
        data["grid_unit_width"] = self.grid_unit_width
        data["grid_unit_height"] = self.grid_unit_height
        return data

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "Tile":
        t = cls()
        t.group = Group(data["group"]) if data.get("group") else None
        t.mask = data.get("mask")
        t.design = [Design(d) for d in data["design"]] if data.get("design") else None
        t.number = data.get("number")
        t.level = data.get("level")
        t.rotation = data.get("rotation")
        t.invert = data.get("invert")
        t.anti = data.get("anti")
        t.flip = data.get("flip")
        t.density = data.get("density")
        t.unit_width = data.get("unit_width")
        t.unit_height = data.get("unit_height")
        t.grid_size = data.get("grid_size")
        t.grid_unit_width = data.get("grid_unit_width")
        t.grid_unit_height = data.get("grid_unit_height")
        return t
