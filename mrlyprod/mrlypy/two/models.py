import numpy as np
from copy import deepcopy
from PIL import Image
from typing import Any, Dict, List, Optional, Tuple, TYPE_CHECKING
from mrlypy.core.enums import Mode
from mrlypy.core.errors import MrlyError

if TYPE_CHECKING:
    from mrlypy.core.colors import Color
    from mrlypy.three.models import Cell3d

class Cell2d:

    def __init__(
        self,
        width: Optional[int] = None,
        height: Optional[int] = None,
        types: Optional[np.ndarray] = None,
        colors: Optional[np.ndarray] = None,
        tags: Optional[np.ndarray] = None,
    ):
        self._width = width
        self._height = height
        self._types = types
        self._colors = colors
        self._tags = tags

    @property
    def width(self) -> int:
        if self._types is not None:
            return self._types.shape[1]
        if self._colors is not None:
            return self._colors.shape[1]
        if self._tags is not None:
            return self._tags.shape[1]
        if self._width is not None:
            return self._width
        raise MrlyError("Cell2d has no data and no dimensions")

    @property
    def height(self) -> int:
        if self._types is not None:
            return self._types.shape[0]
        if self._colors is not None:
            return self._colors.shape[0]
        if self._tags is not None:
            return self._tags.shape[0]
        if self._height is not None:
            return self._height
        raise MrlyError("Cell2d has no data and no dimensions")

    @property
    def types(self) -> np.ndarray:
        if self._types is None:
            self._types = np.zeros((self.height, self.width), dtype=np.uint8)
        return self._types

    @types.setter
    def types(self, value: np.ndarray):
        self._types = value

    @property
    def colors(self) -> np.ndarray:
        if self._colors is None:
            self._colors = np.zeros((self.height, self.width, 4), dtype=np.uint8)
        return self._colors

    @colors.setter
    def colors(self, value: Optional[np.ndarray]):
        self._colors = value

    @property
    def tags(self) -> np.ndarray:
        if self._tags is None:
            self._tags = np.zeros((self.height, self.width), dtype=np.uint8)
        return self._tags

    @tags.setter
    def tags(self, value: Optional[np.ndarray]):
        self._tags = value

    # MAIN

    def shape(self) -> Tuple[int, int]:
        return (self.height, self.width)

    def __repr__(self) -> str:
        return f"Cell2d(width={self.width}, height={self.height})"

    def copy(self) -> "Cell2d":
        return deepcopy(self)

    def to_3d(self) -> "Cell3d":
        from mrlypy.three.models import Cell3d
        return Cell3d(types=self.types[:, :, np.newaxis])

    @classmethod
    def from_3d(cls, cell: "Cell3d") -> "Cell2d":
        types = cell.types[:, :, 0]
        return cls(types=types)

    # SERIALIZER

    def to_dict(self) -> Dict[str, Any]:
        from . import serializer
        return serializer.to_dict_2d(self)

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "Cell2d":
        from . import serializer
        return serializer.from_dict_2d(data)

    def to_array(self) -> np.ndarray:
        from . import serializer
        return serializer.to_array_2d(self)

    @classmethod
    def from_array(cls, array: np.ndarray) -> "Cell2d":
        from . import serializer
        return serializer.from_array_2d(array)

    def to_list(self) -> List[List[int]]:
        from . import serializer
        return serializer.to_list_2d(self)

    @classmethod
    def from_list(cls, list: List[List[int]]) -> "Cell2d":
        from . import serializer
        return serializer.from_list_2d(list)

    def to_strings(self) -> List[str]:
        from . import serializer
        return serializer.to_strings_2d(self)

    @classmethod
    def from_strings(cls, data: List[str]) -> "Cell2d":
        from . import serializer
        return serializer.from_strings_2d(data)

    # GEOMETRY

    def invert(self) -> "Cell2d":
        from . import geometry
        return geometry.invert_2d(self)

    def anti(self) -> "Cell2d":
        from . import geometry
        return geometry.invert_2d(self)

    def pad(self, count: int = 1, value: int = 0) -> "Cell2d":
        from . import geometry
        return geometry.pad_2d(self, count, value)

    def rotate(self, k: int = 1) -> "Cell2d":
        from . import geometry
        return geometry.rotate_2d(self, k)

    def fractal(self, level: int = 1) -> "Cell2d":
        from . import geometry
        return geometry.fractal_2d(self, level)

    def tile(self, width: int, height: int) -> "Cell2d":
        from . import geometry
        return geometry.tile_2d(self, width, height)

    def layers(self, dtype: np.dtype = np.dtype(np.uint8)) -> "Cell2d":
        from . import geometry
        return geometry.layers_2d(self, dtype)

    def neighbors(self, types: np.ndarray, target: int = 1, mode: str = "constant", dtype: np.dtype = np.dtype(np.uint8)) -> "Cell2d":
        from . import geometry
        return geometry.neighbors_2d(self, types, target, mode, dtype)

    # CENSUS

    def census(self) -> Dict[str, int]:
        from mrlypy.core import census
        return census.census_2d(self.types)

    # PAINTER

    def paint(self, palette: Optional[Dict[int, List["Color"]]] = None, mode: Optional[Mode] = None) -> "Cell2d":
        from . import painter
        return painter.paint_2d(self, palette, mode)

    # RENDERER

    def text(self, mapping: Optional[Dict[int, str]] = None) -> List[str]:
        from . import renderer
        return renderer.text_2d(self.types, mapping)

    def to_image(self, scale: int = 1) -> Image.Image:
        from . import renderer
        return renderer.to_image(self, scale)

    @classmethod
    def from_image(cls, image: Image.Image) -> "Cell2d":
        from . import renderer
        return renderer.from_image(image)

    def draw_square(self, scale: int = 1, outline: Optional["Color"] = None, width: int = 1) -> Image.Image:
        from . import renderer
        return renderer.draw_square(self, scale, outline, width)

    def draw_circle(self, scale: int = 1, outline: Optional["Color"] = None, width: int = 1) -> Image.Image:
        from . import renderer
        return renderer.draw_circle(self, scale, outline, width)

    def draw_diamond(self, scale: int = 1, outline: Optional["Color"] = None, width: int = 1) -> Image.Image:
        from . import renderer
        return renderer.draw_diamond(self, scale, outline, width)

    def svg_square(self, scale: int = 1, outline: Optional["Color"] = None, width: int = 1) -> str:
        from . import renderer
        return renderer.svg_square(self, scale, outline, width)

    def svg_circle(self, scale: int = 1, outline: Optional["Color"] = None, width: int = 1) -> str:
        from . import renderer
        return renderer.svg_circle(self, scale, outline, width)

    def svg_diamond(self, scale: int = 1, outline: Optional["Color"] = None, width: int = 1) -> str:
        from . import renderer
        return renderer.svg_diamond(self, scale, outline, width)
