from copy import deepcopy
from typing import Dict, List, Optional, TYPE_CHECKING

if TYPE_CHECKING:
    from mrlytwo.models import Cell2d

class Cell6d:

    def __init__(
        self,
        cell: "Cell2d",
        projection: str = "iso",
        orientation: str = "vertical",
        start: int = 1,
    ):
        self._cell = cell
        self.projection = projection
        self.orientation = orientation
        self.start = start

    @property
    def cell(self) -> "Cell2d":
        return self._cell

    @property
    def width(self) -> int:
        return self._cell.width

    @property
    def height(self) -> int:
        return self._cell.height

    @property
    def types(self):
        return self._cell.types

    @types.setter
    def types(self, value):
        self._cell.types = value

    @property
    def colors(self):
        return self._cell.colors

    @colors.setter
    def colors(self, value):
        self._cell.colors = value

    @property
    def tags(self):
        return self._cell.tags

    @tags.setter
    def tags(self, value):
        self._cell.tags = value

    @property
    def _types(self):
        return self._cell._types

    @property
    def _colors(self):
        return self._cell._colors

    @property
    def _tags(self):
        return self._cell._tags

    def __repr__(self) -> str:
        return f"Cell6d(width={self.width}, height={self.height}, projection={self.projection})"

    def copy(self) -> "Cell6d":
        return Cell6d(
            cell=deepcopy(self._cell),
            projection=self.projection,
            orientation=self.orientation,
            start=self.start,
        )

    def anti(self) -> "Cell6d":
        import numpy as np
        from . import FILL, VOID
        types = self._cell.types
        swapped = types.copy()
        swapped[types == FILL] = VOID
        swapped[types == VOID] = FILL
        self._cell.types = swapped
        return self

    def text(self, mapping: Optional[Dict[int, str]] = None) -> List[str]:
        return self._cell.text(mapping)

    def paint(self, palette=None, mode=None) -> "Cell6d":
        from . import painter
        return painter.paint_6d(self, palette, mode)

    def draw(self, scale: int = 1, outline=None, width: int = 1):
        from . import renderer
        return renderer.draw(self._cell, scale, self.orientation, self.start, outline, width)

    def svg(self, scale: int = 1, outline=None, width: int = 1) -> str:
        from . import renderer
        return renderer.svg(self._cell, scale, self.orientation, self.start, outline, width)
