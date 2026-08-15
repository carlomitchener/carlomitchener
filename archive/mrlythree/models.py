import io
import numpy as np
from copy import deepcopy
from typing import Any, Dict, List, Optional, Tuple, TYPE_CHECKING
from mrlycore.enums import Mode
from mrlycore.errors import MrlyError

if TYPE_CHECKING:
    from mrlycore.colors import Color
    from mrlytwo.models import Cell2d

class Cell3d:

    def __init__(
        self,
        width: Optional[int] = None,
        height: Optional[int] = None,
        depth: Optional[int] = None,
        types: Optional[np.ndarray] = None,
        colors: Optional[np.ndarray] = None,
        tags: Optional[np.ndarray] = None,
    ):
        self._width = width
        self._height = height
        self._depth = depth
        self._types = types
        self._colors = colors
        self._tags = tags

    @property
    def width(self) -> int:
        if self._types is not None:
            return self._types.shape[2]
        if self._colors is not None:
            return self._colors.shape[2]
        if self._tags is not None:
            return self._tags.shape[2]
        if self._width is not None:
            return self._width
        raise MrlyError("Cell3d has no data and no dimensions")

    @property
    def height(self) -> int:
        if self._types is not None:
            return self._types.shape[1]
        if self._colors is not None:
            return self._colors.shape[1]
        if self._tags is not None:
            return self._tags.shape[1]
        if self._height is not None:
            return self._height
        raise MrlyError("Cell3d has no data and no dimensions")

    @property
    def depth(self) -> int:
        if self._types is not None:
            return self._types.shape[0]
        if self._colors is not None:
            return self._colors.shape[0]
        if self._tags is not None:
            return self._tags.shape[0]
        if self._depth is not None:
            return self._depth
        raise MrlyError("Cell3d has no data and no dimensions")

    @property
    def types(self) -> np.ndarray:
        if self._types is None:
            self._types = np.zeros((self.depth, self.height, self.width), dtype=np.uint8)
        return self._types

    @types.setter
    def types(self, value: np.ndarray):
        self._types = value

    @property
    def colors(self) -> np.ndarray:
        if self._colors is None:
            self._colors = np.zeros((self.depth, self.height, self.width, 4), dtype=np.uint8)
        return self._colors

    @colors.setter
    def colors(self, value: Optional[np.ndarray]):
        self._colors = value

    @property
    def tags(self) -> np.ndarray:
        if self._tags is None:
            self._tags = np.zeros((self.depth, self.height, self.width), dtype=np.uint8)
        return self._tags

    @tags.setter
    def tags(self, value: Optional[np.ndarray]):
        self._tags = value

    # MAIN

    def shape(self) -> Tuple[int, int, int]:
        return (self.depth, self.height, self.width)

    def __repr__(self) -> str:
        return f"Cell3d(width={self.width}, height={self.height}, depth={self.depth})"

    def copy(self) -> "Cell3d":
        return deepcopy(self)

    def to_2d(self) -> "Cell2d":
        from mrlytwo.models import Cell2d
        return Cell2d(types=self.types[0])

    @classmethod
    def from_2d(cls, cell: "Cell2d") -> "Cell3d":
        types = cell.types[np.newaxis, :, :]
        return cls(types=types)

    def extrude(self, depth: int = 1) -> "Cell3d":
        if depth < 1:
            raise MrlyError("Extrusion depth must be at least 1.")
        self.types = np.repeat(self.types, depth, axis=0)
        return self

    # SERIALIZER

    def to_dict(self) -> Dict[str, Any]:
        from . import serializer
        return serializer.to_dict_3d(self)

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "Cell3d":
        from . import serializer
        return serializer.from_dict_3d(data)

    def to_array(self) -> np.ndarray:
        from . import serializer
        return serializer.to_array_3d(self)

    @classmethod
    def from_array(cls, array: np.ndarray) -> "Cell3d":
        from . import serializer
        return serializer.from_array_3d(array)

    def to_list(self) -> List[List[List[int]]]:
        from . import serializer
        return serializer.to_list_3d(self)

    @classmethod
    def from_list(cls, list: List[List[List[int]]]) -> "Cell3d":
        from . import serializer
        return serializer.from_list_3d(list)

    def to_strings(self) -> List[List[str]]:
        from . import serializer
        return serializer.to_strings_3d(self)

    @classmethod
    def from_strings(cls, data: List[List[str]]) -> "Cell3d":
        from . import serializer
        return serializer.from_strings_3d(data)

    # GEOMETRY

    def invert(self) -> "Cell3d":
        from . import geometry
        return geometry.invert_3d(self)

    def anti(self) -> "Cell3d":
        from . import geometry
        return geometry.invert_3d(self)

    def pad(self, count: int = 1, value: int = 0) -> "Cell3d":
        from . import geometry
        return geometry.pad_3d(self, count, value)

    def rotate(self, k: int = 1, axes: Tuple[int, int] = (1, 2)) -> "Cell3d":
        from . import geometry
        return geometry.rotate_3d(self, k, axes)

    def fractal(self, level: int = 1) -> "Cell3d":
        from . import geometry
        return geometry.fractal_3d(self, level)

    def tile(self, width: int, height: int, depth: int) -> "Cell3d":
        from . import geometry
        return geometry.tile_3d(self, width, height, depth)

    def layers(self, dtype: np.dtype = np.dtype(np.uint8)) -> "Cell3d":
        from . import geometry
        return geometry.layers_3d(self, dtype)

    def neighbors(self, mode: str = "constant") -> "Cell3d":
        from . import geometry
        return geometry.neighbors_3d(self, mode)

    # CENSUS

    def census(self) -> Dict[str, int]:
        from mrlycore import census
        return census.census_3d(self.types)

    # PAINTER

    def paint(self, palette: Optional[Dict[int, List["Color"]]] = None, mode: Optional[Mode] = None) -> "Cell3d":
        from . import painter
        return painter.paint_3d(self, palette, mode)

    # RENDERER

    def text(self, mapping: Optional[Dict[int, str]] = None) -> List[str]:
        from . import renderer
        return renderer.text_3d(self.types, mapping)

    def to_obj(self) -> str:
        from . import renderer
        with io.StringIO() as f:
            renderer.to_obj(self, f)
            return f.getvalue()

    def save_obj(self, filename: str) -> None:
        from . import renderer
        with open(filename, "w") as f:
            renderer.to_obj(self, f)
